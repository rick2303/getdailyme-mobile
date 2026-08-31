import type { QueryClient } from "@tanstack/react-query";

import {
  createActivity,
  deleteActivity,
  replaceActivityShares,
  updateActivity,
  type ActivityInput,
} from "@/lib/api/activities";
import {
  createEvent,
  deleteEvent,
  inviteMembers,
  leaveEvent,
  removeMembers,
  respondToInvite,
  updateEvent,
  type EventInput,
} from "@/lib/api/events";
import { addReaction, removeReaction } from "@/lib/api/feed";
import { createLog, deleteLog, type CreateLogInput } from "@/lib/api/logs";
import {
  removeFriendship,
  respondToFriendRequest,
  sendFriendRequest,
  sendNudge,
} from "@/lib/api/friends";
import { removeActivityPhoto } from "@/lib/api/storage";
import { removeFolder } from "@/lib/storage/folders";
import { requestPush, type NotifySource } from "@/lib/push/client";
import type { EventMemberStatus, FriendshipStatus, ReactionType } from "@/lib/api/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { mutationKeys } from "./keys";

export type CreateLogVariables = CreateLogInput;

export type DeleteLogVariables = { logId: string; userId: string; photoUrl?: string | null };

export type ToggleReactionVariables = {
  logId: string;
  userId: string;
  type: ReactionType;
  shouldAdd: boolean;
};

export type SendNudgeVariables = { userId: string; receiverId: string };

export type CreateActivityVariables = {
  id: string;
  userId: string;
  input: ActivityInput;
  position: number;
};

export type UpdateActivityVariables = {
  activityId: string;
  userId: string;
  patch: Partial<ActivityInput & { is_archived: boolean; position: number }>;
};

export type DeleteActivityVariables = { activityId: string; userId: string };

export type ReplaceSharesVariables = { activityId: string; friendIds: string[] };

export type FriendRequestVariables = { userId: string; addresseeId: string };

export type RespondFriendVariables = {
  friendshipId: string;
  userId: string;
  status: Extract<FriendshipStatus, "accepted" | "declined">;
};

export type RemoveFriendVariables = { friendshipId: string; userId: string };

export type CreateEventVariables = {
  id: string;
  userId: string;
  input: EventInput;
  invitees: string[];
};

export type UpdateEventVariables = {
  eventId: string;
  userId: string;
  patch: Partial<EventInput>;
  invitees?: string[];
  currentInvitees?: string[];
};

export type DeleteEventVariables = { eventId: string; userId: string };

export type RespondInviteVariables = {
  eventId: string;
  userId: string;
  status: Extract<EventMemberStatus, "going" | "declined">;
};

export type LeaveEventVariables = { eventId: string; userId: string };

// El aviso no puede tumbar la mutacion: reaccionar tiene que funcionar aunque
// el push falle. Pero tragarselo del todo fue justo lo que hizo invisible
// durante semanas que los avisos no llegaban, asi que el fallo se anota. En
// produccion no molesta a nadie y en desarrollo sale en la consola de Metro.
async function notifyQuietly(source: NotifySource) {
  try {
    await requestPush(source);
  } catch (caught) {
    const label = typeof source === "string" ? source : source.type;
    console.warn(`push-notify fallo para "${label}":`, caught);
  }
}

export function registerOfflineMutations(queryClient: QueryClient) {
  const invalidateLogs = () => {
    queryClient.invalidateQueries({ queryKey: ["logs"] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const invalidateActivities = (userId: string) => {
    queryClient.invalidateQueries({ queryKey: ["activities", userId] });
  };

  const invalidateFriends = (userId: string) => {
    queryClient.invalidateQueries({ queryKey: ["friends", userId] });
    queryClient.invalidateQueries({ queryKey: ["profile-search"] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const invalidateEvents = (userId: string, eventId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["events", userId] });
    if (eventId) {
      queryClient.invalidateQueries({ queryKey: ["events", "detail", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-photos", eventId] });
    }
  };

  queryClient.setMutationDefaults(mutationKeys.createLog, {
    mutationFn: async (variables: CreateLogVariables) => {
      const created = await createLog(getSupabaseBrowserClient(), variables);

      // Quien decide si esto merece aviso es el servidor: solo el primer
      // registro del dia de esta persona, solo a sus amistades, y solo a quien
      // pueda ver la actividad. Aqui basta con contarle que hubo registro.
      // Va suelto a proposito: el aviso no puede retrasar el guardado.
      if (created) void notifyQuietly({ type: "friend_log", logId: variables.id });

      return created;
    },
    onSettled: (_data, _error, variables) => {
      invalidateLogs();
      if (variables) invalidateActivities(variables.user_id);
    },
  });

  queryClient.setMutationDefaults(mutationKeys.deleteLog, {
    mutationFn: async (variables: DeleteLogVariables) => {
      const client = getSupabaseBrowserClient();
      await deleteLog(client, variables.logId);
      if (variables.photoUrl) await removeActivityPhoto(client, variables.photoUrl);
    },
    onSettled: invalidateLogs,
  });

  queryClient.setMutationDefaults(mutationKeys.toggleReaction, {
    mutationFn: async (variables: ToggleReactionVariables) => {
      const client = getSupabaseBrowserClient();

      if (!variables.shouldAdd) {
        await removeReaction(client, variables.logId, variables.userId, variables.type);
        return;
      }

      const reactionId = await addReaction(
        client,
        variables.logId,
        variables.userId,
        variables.type,
      );
      if (reactionId) await notifyQuietly({ type: "reaction", reactionId });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  queryClient.setMutationDefaults(mutationKeys.sendNudge, {
    mutationFn: async (variables: SendNudgeVariables) => {
      const outcome = await sendNudge(
        getSupabaseBrowserClient(),
        variables.userId,
        variables.receiverId,
      );
      if (outcome.status === "sent") {
        await notifyQuietly({ type: "nudge", nudgeId: outcome.nudgeId });
      }
      return outcome;
    },
    onSettled: (_data, _error, variables) => {
      if (variables) {
        queryClient.invalidateQueries({ queryKey: ["nudges-sent", variables.userId] });
      }
    },
  });

  queryClient.setMutationDefaults(mutationKeys.createActivity, {
    mutationFn: async (variables: CreateActivityVariables) =>
      createActivity(
        getSupabaseBrowserClient(),
        variables.userId,
        variables.input,
        variables.position,
        variables.id,
      ),
    onSettled: (_data, _error, variables) => {
      if (variables) invalidateActivities(variables.userId);
    },
  });

  queryClient.setMutationDefaults(mutationKeys.updateActivity, {
    mutationFn: async (variables: UpdateActivityVariables) =>
      updateActivity(getSupabaseBrowserClient(), variables.activityId, variables.patch),
    onSettled: (_data, _error, variables) => {
      if (variables) invalidateActivities(variables.userId);
    },
  });

  queryClient.setMutationDefaults(mutationKeys.deleteActivity, {
    mutationFn: async (variables: DeleteActivityVariables) => {
      const client = getSupabaseBrowserClient();
      await deleteActivity(client, variables.activityId);
      // Mejor esfuerzo: si falla quedan huerfanos, igual que antes, pero la
      // actividad ya esta borrada y eso es lo que importa.
      await removeFolder(
        client,
        "activity-photos",
        `${variables.userId}/${variables.activityId}`,
      ).catch(() => undefined);
    },
    onSettled: (_data, _error, variables) => {
      if (variables) invalidateActivities(variables.userId);
      invalidateLogs();
    },
  });

  queryClient.setMutationDefaults(mutationKeys.replaceShares, {
    mutationFn: async (variables: ReplaceSharesVariables) =>
      replaceActivityShares(getSupabaseBrowserClient(), variables.activityId, variables.friendIds),
    onSettled: (_data, _error, variables) => {
      if (variables) {
        queryClient.invalidateQueries({ queryKey: ["activity-shares", variables.activityId] });
      }
    },
  });

  queryClient.setMutationDefaults(mutationKeys.sendFriendRequest, {
    mutationFn: async (variables: FriendRequestVariables) => {
      await sendFriendRequest(getSupabaseBrowserClient(), variables.userId, variables.addresseeId);
      void notifyQuietly({ type: "friend_request", addresseeId: variables.addresseeId });
    },
    onSettled: (_data, _error, variables) => {
      if (variables) invalidateFriends(variables.userId);
    },
  });

  queryClient.setMutationDefaults(mutationKeys.respondFriendRequest, {
    mutationFn: async (variables: RespondFriendVariables) =>
      respondToFriendRequest(
        getSupabaseBrowserClient(),
        variables.friendshipId,
        variables.status,
      ).then(() => {
        if (variables.status === "accepted") {
          void notifyQuietly({ type: "friend_accept", friendshipId: variables.friendshipId });
        }
      }),
    onSettled: (_data, _error, variables) => {
      if (variables) invalidateFriends(variables.userId);
    },
  });

  queryClient.setMutationDefaults(mutationKeys.removeFriend, {
    mutationFn: async (variables: RemoveFriendVariables) =>
      removeFriendship(getSupabaseBrowserClient(), variables.friendshipId),
    onSettled: (_data, _error, variables) => {
      if (variables) invalidateFriends(variables.userId);
    },
  });

  queryClient.setMutationDefaults(mutationKeys.createEvent, {
    mutationFn: async (variables: CreateEventVariables) => {
      const created = await createEvent(
        getSupabaseBrowserClient(),
        variables.userId,
        variables.input,
        variables.invitees,
        variables.id,
      );

      // Quien monta el evento no cuenta: su fila entra como 'going', no como
      // invitacion. Va suelto a proposito, igual que el resto de avisos: que
      // falle el push no puede tumbar la creacion del evento.
      const invitados = variables.invitees.filter((id) => id !== variables.userId);
      if (invitados.length > 0) {
        void notifyQuietly({ type: "event_invite", eventId: variables.id, userIds: invitados });
      }

      return created;
    },
    onSettled: (_data, _error, variables) => {
      if (variables) invalidateEvents(variables.userId, variables.id);
    },
  });

  queryClient.setMutationDefaults(mutationKeys.updateEvent, {
    mutationFn: async (variables: UpdateEventVariables) => {
      const client = getSupabaseBrowserClient();

      if (variables.invitees && variables.currentInvitees) {
        const added = variables.invitees.filter(
          (id) => !variables.currentInvitees!.includes(id),
        );
        const removed = variables.currentInvitees.filter(
          (id) => !variables.invitees!.includes(id),
        );
        await inviteMembers(client, variables.eventId, added);
        await removeMembers(client, variables.eventId, removed);

        // Solo a los que entran ahora. Avisar a toda la lista cada vez que se
        // edita el evento manda un push repetido a quien ya estaba invitado.
        if (added.length > 0) {
          void notifyQuietly({ type: "event_invite", eventId: variables.eventId, userIds: added });
        }
      }

      return updateEvent(client, variables.eventId, variables.patch);
    },
    onSettled: (_data, _error, variables) => {
      if (variables) invalidateEvents(variables.userId, variables.eventId);
    },
  });

  queryClient.setMutationDefaults(mutationKeys.deleteEvent, {
    mutationFn: async (variables: DeleteEventVariables) => {
      const client = getSupabaseBrowserClient();
      // Los archivos primero: la politica que deja al creador vaciar la carpeta
      // comprueba el evento, asi que despues de borrar la fila ya no aplica.
      await removeFolder(client, "event-photos", variables.eventId).catch(() => undefined);
      await deleteEvent(client, variables.eventId);
    },
    onSettled: (_data, _error, variables) => {
      if (variables) invalidateEvents(variables.userId, variables.eventId);
    },
  });

  queryClient.setMutationDefaults(mutationKeys.respondInvite, {
    mutationFn: async (variables: RespondInviteVariables) =>
      respondToInvite(
        getSupabaseBrowserClient(),
        variables.eventId,
        variables.userId,
        variables.status,
      ),
    onSettled: (_data, _error, variables) => {
      if (variables) invalidateEvents(variables.userId, variables.eventId);
    },
  });

  queryClient.setMutationDefaults(mutationKeys.leaveEvent, {
    mutationFn: async (variables: LeaveEventVariables) =>
      leaveEvent(getSupabaseBrowserClient(), variables.eventId, variables.userId),
    onSettled: (_data, _error, variables) => {
      if (variables) invalidateEvents(variables.userId, variables.eventId);
    },
  });
}
