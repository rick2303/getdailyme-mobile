-- Cuenta de demostracion para App Review y para Play, en SQL puro.
--
-- Es la version para pegar en el SQL Editor de Supabase del script de Node
-- `scripts/seed-review-account.mjs`. Hace lo mismo salvo una cosa: NO sube las
-- fotos, porque desde SQL no se puede escribir en Storage. Las rutas quedan
-- puestas y los archivos se suben a mano (ver el bloque final, que las imprime).
--
-- ---------------------------------------------------------------------------
-- LEE ESTO ANTES DE EJECUTARLO
-- ---------------------------------------------------------------------------
-- Escribe directamente en `auth.users` y `auth.identities`. Supabase lo
-- desaconseja: son tablas internas de GoTrue y su formato puede cambiar entre
-- versiones. Si eso pasa, estas siete cuentas dejan de poder iniciar sesion — y
-- te enteras el dia que el revisor lo intenta.
--
-- La via soportada es el script de Node, que usa la Auth Admin API. Esto existe
-- solo para no tener que abrir una terminal. Si algun dia el login de la cuenta
-- de revision falla sin explicacion, empieza por aqui.
--
-- Es idempotente: borra el elenco y lo vuelve a crear. No toca a nadie mas.
--
-- ---------------------------------------------------------------------------
-- QUE DEJA
-- ---------------------------------------------------------------------------
--   7 personas   Alex (la cuenta de revision) y seis mas
--   120 dias     de historial, con huecos creibles
--   5 amistades  aceptadas, y 1 solicitud sin contestar
--   feed         con notas, reacciones y un hilo de comentarios con respuesta
--   3 eventos, 2 clubs, 3 retos con clasificacion
--   1 actividad  en privacidad personalizada
--
-- Credenciales: review@getdailyme.com / Review2026!

do $$
declare
  -- -------------------------------------------------------------------------
  -- Parametros
  -- -------------------------------------------------------------------------
  v_locale   text := 'en';              -- 'en' o 'es'
  v_tz       text := 'Europe/Madrid';   -- la zona de la cuenta, no la tuya
  v_password text := 'Review2026!';
  v_days     int  := 120;

  -- Dias sin registrar. El primero corta la racha; el resto son huecos sueltos
  -- para que el mapa de calor no parezca generado.
  v_gaps int[] := array[14, 31, 32, 47, 63, 64, 65, 88, 101];

  v_cast text[][] := array[
    ['review@getdailyme.com',         'alex',     'Alex Rivera'],
    ['sofia.marquez@getdailyme.com',  'sofiam',   'Sofía Márquez'],
    ['daniel.okafor@getdailyme.com',  'danielok', 'Daniel Okafor'],
    ['mia.chen@getdailyme.com',       'miachen',  'Mia Chen'],
    ['tomas.herrera@getdailyme.com',  'tomash',   'Tomás Herrera'],
    ['priya.nair@getdailyme.com',     'priyan',   'Priya Nair'],
    ['noah.bergstrom@getdailyme.com', 'noahb',    'Noah Bergström']
  ];

  v_email text;
  v_uid uuid;
  v_alex uuid;
  v_i int;
  v_day int;
  v_n int;
  v_seat int;
  v_when timestamptz;
  v_now_min int;
  v_act record;
  v_friend record;
  v_log record;
  v_rows int := 0;
  v_comment_id uuid;
  v_club uuid;
  v_challenge uuid;
  v_event uuid;
  v_old uuid[];
begin
  -- ==========================================================================
  -- 1. Fuera lo anterior
  -- ==========================================================================
  -- Por correo y no por identificador: una version anterior del script creo
  -- estas mismas cuentas con ids aleatorios.
  select array_agg(id) into v_old
    from auth.users
   where email = any (array(select v_cast[i][1] from generate_subscripts(v_cast, 1) i))
      or email = 'review.friend@getdailyme.com';

  if v_old is not null then
    -- Los comentarios, a mano y antes que nada. Al borrar un perfil la clave
    -- foranea pone reply_to_user_id a NULL, y enforce_comment_thread rechaza esa
    -- actualizacion: es un guardia legitimo contra respuestas huerfanas, asi que
    -- hay que adelantarse en vez de desactivarlo.
    delete from public.comments
     where user_id = any (v_old)
        or reply_to_user_id = any (v_old)
        or log_id in (select id from public.activity_logs where user_id = any (v_old));

    -- Y ahora si: borrar de auth.users arrastra el perfil y, desde el, los
    -- registros, eventos, clubs y retos por cascada.
    delete from auth.users where id = any (v_old);
  end if;

  -- ==========================================================================
  -- 2. Las siete cuentas
  -- ==========================================================================
  -- Los identificadores salen de un md5 del correo, no de gen_random_uuid():
  -- asi la ruta de las fotos en Storage es la misma cada vez que se re-siembra
  -- y no hay que volver a subirlas.
  for v_i in 1 .. array_length(v_cast, 1) loop
    v_email := v_cast[v_i][1];
    v_uid := md5('gdm-user-' || v_email)::uuid;
    if v_i = 1 then v_alex := v_uid; end if;

    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(), now(), now(), now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('full_name', v_cast[v_i][3], 'locale', v_locale),
      '', '', '', ''
    );

    -- Sin esta fila GoTrue no reconoce el proveedor y el login falla.
    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_uid, v_uid::text, 'email',
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );

    -- El trigger handle_new_user ya creo el perfil y las cinco actividades.
    update public.profiles
       set username = v_cast[v_i][2]::extensions.citext,
           display_name = v_cast[v_i][3],
           locale = v_locale,
           timezone = v_tz,
           onboarded_at = now()
     where id = v_uid;

    -- Identificadores fijos tambien para las actividades, por lo mismo que los
    -- de las personas. Aqui todavia no hay registros que apunten a ellas.
    --
    -- Derivados de la POSICION y no del nombre: el trigger crea las cinco en el
    -- idioma del perfil, asi que con el nombre las rutas de Storage cambiarian
    -- al re-sembrar en el otro idioma y las fotos ya subidas dejarian de verse.
    update public.activities a
       set id = md5('gdm-act-' || v_email || '-' || a.position)::uuid
     where a.user_id = v_uid;
  end loop;

  -- ==========================================================================
  -- 3. Amistades
  -- ==========================================================================
  for v_i in 2 .. 6 loop
    insert into public.friendships (requester_id, addressee_id, status, responded_at)
    values (md5('gdm-user-' || v_cast[v_i][1])::uuid, v_alex, 'accepted',
            now() - make_interval(days => 5 + v_i));
  end loop;

  -- Noah queda pendiente: sin esto no hay forma de ensenar la pantalla de
  -- solicitudes recibidas.
  insert into public.friendships (requester_id, addressee_id, status)
  values (md5('gdm-user-' || v_cast[7][1])::uuid, v_alex, 'pending');

  -- ==========================================================================
  -- 4. Historial
  -- ==========================================================================
  -- Las horas se calculan en la zona de la CUENTA, no en la del servidor. Con
  -- `at time zone` sobre una marca local sale el instante correcto; hacerlo con
  -- now() a secas mete los registros de madrugada y descuadra las rachas.
  v_now_min := extract(hour from timezone(v_tz, now())) * 60
             + extract(minute from timezone(v_tz, now()));

  for v_i in 1 .. array_length(v_cast, 1) loop
    v_email := v_cast[v_i][1];
    v_uid := md5('gdm-user-' || v_email)::uuid;
    v_seat := (v_i - 1) * 7;

    for v_act in
      select id, name, unit from public.activities where user_id = v_uid order by position
    loop
      for v_day in 0 .. (case when v_i = 1 then v_days else 45 end) - 1 loop
        continue when v_day = any (v_gaps);
        -- Ejercicio dia si dia no, lectura casi siempre, sueno todos menos hoy.
        continue when v_act.unit = 'minute' and (v_day + v_seat) % 2 <> 0;
        continue when v_act.unit = 'page'   and (v_day + v_seat) % 4 = 3;
        continue when v_act.unit = 'hour'   and v_day = 0;

        for v_n in 0 .. (case v_act.unit when 'glass' then 4 when 'serving' then 2 else 0 end) loop
          if v_day = 0 then
            -- Repartidos entre las 7:00 y la hora local de ahora. Si el script
            -- corre de madrugada no hay dia donde repartir y se omite: mejor un
            -- "hoy" vacio que registros en el futuro.
            continue when v_now_min < 8 * 60;
            v_when := ((date_trunc('day', timezone(v_tz, now()))
                        + make_interval(mins => 420 + (v_n * (v_now_min - 440) / 5) + (v_seat % 45)))
                       at time zone v_tz);
          else
            v_when := ((date_trunc('day', timezone(v_tz, now()))
                        - make_interval(days => v_day)
                        + make_interval(hours => 8 + v_n * 3, mins => (v_day * 7 + v_seat) % 60))
                       at time zone v_tz);
          end if;

          insert into public.activity_logs (activity_id, user_id, amount, logged_at, note)
          values (
            v_act.id, v_uid,
            case v_act.unit
              when 'minute' then 20 + (v_day * 5) % 40
              when 'page'   then 10 + (v_day * 7) % 30
              when 'hour'   then 7
              else 1
            end,
            v_when,
            case when v_day = 0 and v_n = 0 and v_act.unit = 'serving'
                 then case when v_locale = 'en' then 'Homemade bowl, third one this week'
                           else 'Bowl de casa, el tercero de la semana' end
                 when v_day = 0 and v_n = 0 and v_act.unit = 'minute'
                 then case when v_locale = 'en' then 'Legs and a bit of cardio'
                           else 'Piernas y algo de cardio' end
                 else null end
          );
          v_rows := v_rows + 1;
        end loop;
      end loop;
    end loop;
  end loop;

  -- ==========================================================================
  -- 5. Las fotos
  -- ==========================================================================
  -- Solo la referencia: el archivo se sube a mano al bucket activity-photos.
  -- La ruta tiene que ser {user_id}/{activity_id}/... porque asi la comprueba
  -- can_view_activity_photo; cualquier otra cosa no la puede abrir nadie.
  for v_act in
    select a.id, a.user_id, a.unit
      from public.activities a
     where a.user_id = v_alex and a.unit in ('serving', 'minute', 'page', 'glass')
  loop
    update public.activity_logs l
       set photo_url = v_act.user_id::text || '/' || v_act.id::text || '/'
                       || case v_act.unit
                            when 'serving' then 'food-bowl.jpg'
                            when 'minute'  then 'exercise-dumbbell.jpg'
                            when 'page'    then 'reading-book.jpg'
                            else 'water-glass.jpg'
                          end
     where l.id = (
       select id from public.activity_logs
        where activity_id = v_act.id and user_id = v_alex
        order by logged_at desc limit 1
     );
  end loop;

  -- ==========================================================================
  -- 6. Reacciones, comentarios y lo demas
  -- ==========================================================================
  -- Dos reacciones por persona y repartidas en el tiempo: la bandeja escribe la
  -- misma linea sea cual sea el emoji, asi que cuatro seguidas de la misma
  -- persona se leen como un error de la app.
  for v_i in 2 .. 6 loop
    v_uid := md5('gdm-user-' || v_cast[v_i][1])::uuid;
    v_n := 0;
    for v_log in
      select id from public.activity_logs
       where user_id = v_alex order by logged_at desc limit 6
    loop
      exit when v_n >= 2;
      insert into public.reactions (log_id, user_id, type, created_at)
      values (v_log.id, v_uid,
              (array['fire','clap','heart','laugh','muscle'])[1 + ((v_i + v_n) % 5)]::public.reaction_type,
              now() - make_interval(mins => 25 + v_i * 47 + v_n * 193))
      on conflict do nothing;
      v_n := v_n + 1;
    end loop;
  end loop;

  -- Un hilo con respuesta, que es lo que hace que el feed se lea como algo vivo.
  select id into v_log from public.activity_logs
   where user_id = v_alex and photo_url is not null order by logged_at desc limit 1;

  insert into public.comments (log_id, user_id, body, created_at, updated_at)
  values (v_log.id, md5('gdm-user-' || v_cast[2][1])::uuid,
          case when v_locale = 'en' then 'I need that recipe' else 'Esa receta la quiero' end,
          now() - interval '96 minutes', now() - interval '96 minutes')
  returning id into v_comment_id;

  insert into public.comments (log_id, user_id, body, created_at, updated_at)
  values (v_log.id, md5('gdm-user-' || v_cast[4][1])::uuid,
          case when v_locale = 'en' then 'Jealous. I have not been to the gym in two days'
               else 'Que envidia, yo llevo dos dias sin pisar el gimnasio' end,
          now() - interval '71 minutes', now() - interval '71 minutes');

  insert into public.comments (log_id, user_id, body, parent_id, reply_to_user_id, created_at, updated_at)
  values (v_log.id, v_alex,
          case when v_locale = 'en' then 'I will send you the recipe if you stop'
               else 'Te paso la receta y te callas' end,
          v_comment_id, md5('gdm-user-' || v_cast[2][1])::uuid,
          now() - interval '58 minutes', now() - interval '58 minutes');

  -- Eventos. Uno con Alex sin contestar, para que se vea el boton de aceptar.
  insert into public.events (creator_id, title, description, icon, color, starts_at, ends_at, all_day)
  values (md5('gdm-user-' || v_cast[2][1])::uuid,
          case when v_locale = 'en' then 'Trip to Lisbon' else 'Viaje a Lisboa' end,
          case when v_locale = 'en' then 'Flight at 8:00, do not forget the phone charger.'
               else 'Vuelo a las 8:00, llevar el cargador del movil.' end,
          'tree-palm', 'teal', now() + interval '9 days', now() + interval '13 days', true)
  returning id into v_event;
  insert into public.event_members (event_id, user_id, status) values (v_event, v_alex, 'invited')
  on conflict do nothing;

  insert into public.events (creator_id, title, description, icon, color, starts_at, all_day)
  values (v_alex,
          case when v_locale = 'en' then '10K race' else 'Carrera 10K' end,
          case when v_locale = 'en' then 'Start at the park, meet 20 minutes early.'
               else 'Salida en el parque, nos vemos 20 minutos antes.' end,
          'footprints', 'orange', now() + interval '3 days', false)
  returning id into v_event;
  for v_i in 2 .. 5 loop
    insert into public.event_members (event_id, user_id, status)
    values (v_event, md5('gdm-user-' || v_cast[v_i][1])::uuid, 'going') on conflict do nothing;
  end loop;

  -- Clubs.
  insert into public.clubs (creator_id, name, icon, color, invite_code)
  values (v_alex,
          case when v_locale = 'en' then 'The 6am Club' else 'Los de las 6 de la mañana' end,
          'sunrise', 'amber', 'demo1' || substr(md5(random()::text), 1, 4))
  returning id into v_club;
  for v_i in 2 .. 5 loop
    insert into public.club_members (club_id, user_id, role)
    values (v_club, md5('gdm-user-' || v_cast[v_i][1])::uuid, 'member') on conflict do nothing;
  end loop;

  -- Retos. Cada quien apunta SU actividad: sin activity_id la clasificacion
  -- pinta 0 y la pantalla parece rota.
  insert into public.challenges (creator_id, title, target, starts_on, ends_on)
  values (v_alex,
          case when v_locale = 'en' then '30 days of water' else '30 días de agua' end,
          30, current_date - 9, current_date + 20)
  returning id into v_challenge;
  for v_i in 1 .. 4 loop
    insert into public.challenge_members (challenge_id, user_id, activity_id, status)
    select v_challenge, md5('gdm-user-' || v_cast[v_i][1])::uuid, a.id, 'joined'
      from public.activities a
     where a.user_id = md5('gdm-user-' || v_cast[v_i][1])::uuid and a.unit = 'glass'
    on conflict do nothing;
  end loop;

  -- El diferenciador: una actividad que solo ven dos personas.
  update public.activities set visibility = 'custom'
   where user_id = v_alex and unit = 'hour';
  -- El alias de la serie no puede llamarse v_i: PL/pgSQL ya tiene una variable
  -- con ese nombre y la referencia sale ambigua.
  insert into public.activity_shares (activity_id, friend_id)
  select a.id, md5('gdm-user-' || v_cast[idx][1])::uuid
    from public.activities a, generate_series(2, 3) as idx
   where a.user_id = v_alex and a.unit = 'hour'
  on conflict do nothing;

  -- Un toque pendiente.
  insert into public.nudges (sender_id, receiver_id)
  values (md5('gdm-user-' || v_cast[2][1])::uuid, v_alex) on conflict do nothing;

  -- La bandeja no lee la hora del hecho, lee la de su aviso, y esa la pone un
  -- trigger con now(). Sin este repaso salen veinte avisos con la misma hora.
  update public.notifications n
     set created_at = now() - make_interval(mins => 9 + (row_number * 37))
    from (
      select id, (row_number() over (order by created_at desc))::int as row_number
        from public.notifications where user_id = v_alex and read_at is null
    ) s
   where n.id = s.id;

  raise notice 'Listo: % registros. Usuario review@getdailyme.com / %', v_rows, v_password;
end $$;

-- ---------------------------------------------------------------------------
-- Las rutas donde subir las cuatro fotos
-- ---------------------------------------------------------------------------
-- Bucket `activity-photos`. Sube cada archivo EXACTAMENTE a la ruta que sale
-- aqui, respetando las dos carpetas: la politica de Storage lee el user_id del
-- primer tramo y el activity_id del segundo.
select
  split_part(photo_url, '/', 3) as archivo,
  photo_url as ruta_completa
  from public.activity_logs
 where photo_url is not null
   and user_id = md5('gdm-user-review@getdailyme.com')::uuid
 order by 1;
