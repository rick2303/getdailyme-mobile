# Fotos de la cuenta de demostración, para subir a mano

Solo hacen falta si siembras con **`scripts/sql/seed-review-account.sql`**. La
versión de Node (`npm run seed:review`) las sube sola y esta carpeta le sobra:
desde SQL no se puede escribir en Storage.

## Qué hacer

Supabase → **Storage** → bucket **`activity-photos`** → sube el contenido de
`activity-photos/` **conservando las dos carpetas**.

Cuando termines, el bucket tiene que verse así:

```
activity-photos/
  97643812-ef75-e639-41fc-f27ff45260c8/
    abbfc7c3-1ddd-c8f0-fbbd-c6feb9979188/water-glass.jpg
    172ef752-d1fe-a6d0-f5d9-06610a4a0911/food-bowl.jpg
    0bfb6662-8762-dad1-472f-794f7fed0f0f/exercise-dumbbell.jpg
    94180b79-6c7b-eea6-2569-1e6eba2accec/reading-book.jpg
```

## Por qué esas carpetas y no `demo/` o la raíz

No es capricho. La política de Storage llama a `can_view_activity_photo`, que
lee la ruta por tramos:

```sql
public.storage_path_uuid(p_object_name, 1) = p_viewer          -- 1.º = dueño
or public.can_view_activity(public.storage_path_uuid(p_object_name, 2), ...)  -- 2.º = actividad
```

Una foto en cualquier otro sitio **no la puede abrir nadie**, ni su propio
dueño. No da error al subirla: simplemente no se ve, y lo descubres mirando un
feed con huecos.

## Por qué los identificadores no cambian

Salen de un `md5` del correo y de la posición de la actividad, no de
`gen_random_uuid()`. Dos consecuencias buenas:

- Puedes subir las fotos **antes** de sembrar.
- Re-sembrar no las invalida, así que no hay que volver a subirlas.

Y una razón concreta para usar la posición y no el nombre: el trigger crea las
cinco actividades en el idioma del perfil, así que con el nombre las rutas
cambiarían al sembrar en el otro idioma.

## Si cambias el correo de la cuenta de revisión

`REVIEW_EMAIL` distinto significa `md5` distinto, o sea rutas distintas. Vuelve
a generar esta carpeta con `node scripts/make-upload-tree.mjs`.
