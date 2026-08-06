export type IconCategory =
  | 'health'
  | 'food'
  | 'fitness'
  | 'mind'
  | 'work'
  | 'social'
  | 'home'
  | 'travel'
  | 'hobby'
  | 'other'

export type CatalogIcon = {
  name: string
  category: IconCategory
  labels: { es: string; en: string }
  keywords: { es: string[]; en: string[] }
}

export const ICON_CATEGORIES: readonly IconCategory[] = [
  'health',
  'food',
  'fitness',
  'mind',
  'work',
  'social',
  'home',
  'travel',
  'hobby',
  'other',
] as const

export const DEFAULT_ICON = 'circle-dot'

export const ICON_CATALOG: readonly CatalogIcon[] = [
  {
    name: 'heart-pulse',
    category: 'health',
    labels: { es: 'Salud', en: 'Health' },
    keywords: {
      es: ['salud', 'corazon', 'pulso', 'latido', 'bienestar', 'cardio', 'tension'],
      en: ['health', 'heart', 'pulse', 'heartbeat', 'wellness', 'vitals'],
    },
  },
  {
    name: 'pill',
    category: 'health',
    labels: { es: 'Medicacion', en: 'Medication' },
    keywords: {
      es: ['pastilla', 'pastillas', 'medicina', 'medicamento', 'medicacion', 'tomar pastilla', 'farmacia'],
      en: ['pill', 'pills', 'medicine', 'medication', 'drug', 'tablet', 'pharmacy'],
    },
  },
  {
    name: 'pill-bottle',
    category: 'health',
    labels: { es: 'Suplementos', en: 'Supplements' },
    keywords: {
      es: ['suplemento', 'vitaminas', 'vitamina', 'bote', 'frasco', 'proteina', 'omega'],
      en: ['supplement', 'vitamins', 'vitamin', 'bottle', 'protein', 'omega'],
    },
  },
  {
    name: 'stethoscope',
    category: 'health',
    labels: { es: 'Medico', en: 'Doctor' },
    keywords: {
      es: ['medico', 'doctor', 'consulta', 'revision', 'chequeo', 'cita medica', 'estetoscopio'],
      en: ['doctor', 'checkup', 'appointment', 'clinic', 'stethoscope', 'physician'],
    },
  },
  {
    name: 'syringe',
    category: 'health',
    labels: { es: 'Vacuna', en: 'Vaccine' },
    keywords: {
      es: ['vacuna', 'inyeccion', 'jeringa', 'pinchazo', 'insulina', 'analitica'],
      en: ['vaccine', 'injection', 'syringe', 'shot', 'insulin', 'blood test'],
    },
  },
  {
    name: 'thermometer',
    category: 'health',
    labels: { es: 'Temperatura', en: 'Temperature' },
    keywords: {
      es: ['fiebre', 'termometro', 'temperatura', 'enfermo', 'resfriado', 'gripe'],
      en: ['fever', 'thermometer', 'temperature', 'sick', 'cold', 'flu'],
    },
  },
  {
    name: 'hospital',
    category: 'health',
    labels: { es: 'Hospital', en: 'Hospital' },
    keywords: {
      es: ['hospital', 'clinica', 'urgencias', 'ambulatorio', 'centro de salud'],
      en: ['hospital', 'clinic', 'emergency', 'medical center', 'ward'],
    },
  },
  {
    name: 'bed',
    category: 'health',
    labels: { es: 'Dormir', en: 'Sleep' },
    keywords: {
      es: ['dormir', 'sueno', 'cama', 'siesta', 'descansar', 'acostarse', 'horas de sueno'],
      en: ['sleep', 'bed', 'nap', 'rest', 'bedtime', 'sleeping hours'],
    },
  },
  {
    name: 'moon',
    category: 'health',
    labels: { es: 'Descanso nocturno', en: 'Night rest' },
    keywords: {
      es: ['noche', 'luna', 'sueno', 'dormir pronto', 'nocturno', 'descanso'],
      en: ['night', 'moon', 'sleep', 'early night', 'nocturnal', 'rest'],
    },
  },
  {
    name: 'sunrise',
    category: 'health',
    labels: { es: 'Madrugar', en: 'Wake up early' },
    keywords: {
      es: ['despertar', 'madrugar', 'amanecer', 'levantarse', 'manana', 'rutina matutina'],
      en: ['wake up', 'early', 'sunrise', 'morning', 'get up', 'morning routine'],
    },
  },
  {
    name: 'weight',
    category: 'health',
    labels: { es: 'Peso', en: 'Weight' },
    keywords: {
      es: ['peso', 'bascula', 'pesarse', 'kilos', 'adelgazar', 'imc'],
      en: ['weight', 'scale', 'weigh in', 'kilos', 'pounds', 'bmi'],
    },
  },
  {
    name: 'cigarette-off',
    category: 'health',
    labels: { es: 'No fumar', en: 'No smoking' },
    keywords: {
      es: ['no fumar', 'dejar de fumar', 'sin tabaco', 'antitabaco', 'evitar fumar', 'vicio'],
      en: ['no smoking', 'quit smoking', 'smoke free', 'nicotine free', 'avoid smoking'],
    },
  },
  {
    name: 'wine-off',
    category: 'health',
    labels: { es: 'Sin alcohol', en: 'No alcohol' },
    keywords: {
      es: ['sin alcohol', 'dejar de beber', 'sobrio', 'no beber', 'evitar alcohol', 'abstinencia'],
      en: ['no alcohol', 'sober', 'quit drinking', 'alcohol free', 'avoid drinking'],
    },
  },
  {
    name: 'glass-water',
    category: 'food',
    labels: { es: 'Agua', en: 'Water' },
    keywords: {
      es: ['agua', 'vaso', 'vaso de agua', 'tomar agua', 'beber agua', 'hidratacion', 'hidratarse', 'sed'],
      en: ['water', 'glass', 'glass of water', 'drink water', 'hydration', 'hydrate', 'thirst'],
    },
  },
  {
    name: 'coffee',
    category: 'food',
    labels: { es: 'Cafe', en: 'Coffee' },
    keywords: {
      es: ['cafe', 'cafeina', 'taza', 'te', 'infusion', 'desayuno', 'tomar cafe'],
      en: ['coffee', 'caffeine', 'cup', 'tea', 'brew', 'espresso', 'breakfast'],
    },
  },
  {
    name: 'utensils',
    category: 'food',
    labels: { es: 'Comida', en: 'Meal' },
    keywords: {
      es: ['comida', 'comer', 'almuerzo', 'cena', 'plato', 'cubiertos', 'restaurante', 'menu'],
      en: ['meal', 'eat', 'lunch', 'dinner', 'food', 'cutlery', 'restaurant', 'plate'],
    },
  },
  {
    name: 'salad',
    category: 'food',
    labels: { es: 'Ensalada', en: 'Salad' },
    keywords: {
      es: ['ensalada', 'verde', 'saludable', 'dieta', 'vegetariano', 'comer sano'],
      en: ['salad', 'greens', 'healthy', 'diet', 'vegetarian', 'eat clean'],
    },
  },
  {
    name: 'soup',
    category: 'food',
    labels: { es: 'Sopa', en: 'Soup' },
    keywords: {
      es: ['sopa', 'caldo', 'crema', 'guiso', 'cuchara', 'plato caliente'],
      en: ['soup', 'broth', 'stew', 'bowl', 'ramen', 'hot dish'],
    },
  },
  {
    name: 'apple',
    category: 'food',
    labels: { es: 'Fruta', en: 'Fruit' },
    keywords: {
      es: ['fruta', 'manzana', 'snack', 'merienda', 'pieza de fruta', 'vitaminas'],
      en: ['fruit', 'apple', 'snack', 'healthy snack', 'vitamins'],
    },
  },
  {
    name: 'carrot',
    category: 'food',
    labels: { es: 'Verdura', en: 'Vegetable' },
    keywords: {
      es: ['verdura', 'zanahoria', 'hortaliza', 'vegetal', 'huerto', 'comer verdura'],
      en: ['vegetable', 'carrot', 'veggies', 'greens', 'garden', 'eat veggies'],
    },
  },
  {
    name: 'egg',
    category: 'food',
    labels: { es: 'Huevo', en: 'Egg' },
    keywords: {
      es: ['huevo', 'huevos', 'tortilla', 'proteina', 'desayuno'],
      en: ['egg', 'eggs', 'omelette', 'protein', 'breakfast'],
    },
  },
  {
    name: 'sandwich',
    category: 'food',
    labels: { es: 'Bocadillo', en: 'Sandwich' },
    keywords: {
      es: ['bocadillo', 'sandwich', 'bocata', 'tentempie', 'almuerzo rapido'],
      en: ['sandwich', 'sub', 'snack', 'quick lunch', 'toast'],
    },
  },
  {
    name: 'pizza',
    category: 'food',
    labels: { es: 'Pizza', en: 'Pizza' },
    keywords: {
      es: ['pizza', 'comida rapida', 'italiana', 'porcion', 'cheat meal'],
      en: ['pizza', 'fast food', 'italian', 'slice', 'cheat meal'],
    },
  },
  {
    name: 'milk',
    category: 'food',
    labels: { es: 'Leche', en: 'Milk' },
    keywords: {
      es: ['leche', 'lacteo', 'batido', 'yogur', 'calcio', 'brik'],
      en: ['milk', 'dairy', 'shake', 'yogurt', 'calcium', 'carton'],
    },
  },
  {
    name: 'cake',
    category: 'food',
    labels: { es: 'Tarta', en: 'Cake' },
    keywords: {
      es: ['tarta', 'pastel', 'dulce', 'cumpleanos', 'reposteria', 'postre'],
      en: ['cake', 'birthday', 'sweet', 'baking', 'dessert', 'pastry'],
    },
  },
  {
    name: 'wine',
    category: 'food',
    labels: { es: 'Vino', en: 'Wine' },
    keywords: {
      es: ['vino', 'copa', 'alcohol', 'beber', 'bebida', 'brindis'],
      en: ['wine', 'glass', 'alcohol', 'drink', 'drinking', 'toast'],
    },
  },
  {
    name: 'beer',
    category: 'food',
    labels: { es: 'Cerveza', en: 'Beer' },
    keywords: {
      es: ['cerveza', 'birra', 'alcohol', 'cana', 'bar', 'beber'],
      en: ['beer', 'pint', 'alcohol', 'pub', 'bar', 'drinking'],
    },
  },
  {
    name: 'dumbbell',
    category: 'fitness',
    labels: { es: 'Gimnasio', en: 'Gym' },
    keywords: {
      es: ['gimnasio', 'gym', 'pesas', 'mancuerna', 'entrenar', 'musculacion', 'levantar peso'],
      en: ['gym', 'weights', 'dumbbell', 'workout', 'lifting', 'strength training'],
    },
  },
  {
    name: 'biceps-flexed',
    category: 'fitness',
    labels: { es: 'Fuerza', en: 'Strength' },
    keywords: {
      es: ['fuerza', 'musculo', 'biceps', 'flexiones', 'brazo', 'ejercicio', 'entrenamiento'],
      en: ['strength', 'muscle', 'biceps', 'flex', 'arm', 'exercise', 'workout'],
    },
  },
  {
    name: 'footprints',
    category: 'fitness',
    labels: { es: 'Correr', en: 'Running' },
    keywords: {
      es: ['correr', 'running', 'trotar', 'carrera', 'salir a correr', 'huellas', 'zancada'],
      en: ['run', 'running', 'jog', 'jogging', 'go for a run', 'footprints', 'stride'],
    },
  },
  {
    name: 'person-standing',
    category: 'fitness',
    labels: { es: 'Caminar', en: 'Walking' },
    keywords: {
      es: ['caminar', 'andar', 'pasear', 'paseo', 'pasos', 'dar un paseo', 'senderismo urbano'],
      en: ['walk', 'walking', 'steps', 'stroll', 'go for a walk', 'stand'],
    },
  },
  {
    name: 'bike',
    category: 'fitness',
    labels: { es: 'Bicicleta', en: 'Cycling' },
    keywords: {
      es: ['bici', 'bicicleta', 'ciclismo', 'pedalear', 'spinning', 'ruta en bici'],
      en: ['bike', 'bicycle', 'cycling', 'ride', 'spinning', 'pedal'],
    },
  },
  {
    name: 'waves',
    category: 'fitness',
    labels: { es: 'Natacion', en: 'Swimming' },
    keywords: {
      es: ['natacion', 'nadar', 'piscina', 'agua', 'olas', 'largos', 'mar'],
      en: ['swimming', 'swim', 'pool', 'water', 'waves', 'laps', 'sea'],
    },
  },
  {
    name: 'volleyball',
    category: 'fitness',
    labels: { es: 'Deporte de pelota', en: 'Ball sport' },
    keywords: {
      es: ['pelota', 'balon', 'voleibol', 'futbol', 'baloncesto', 'partido', 'deporte'],
      en: ['ball', 'volleyball', 'soccer', 'football', 'basketball', 'match', 'sport'],
    },
  },
  {
    name: 'trophy',
    category: 'fitness',
    labels: { es: 'Logro', en: 'Achievement' },
    keywords: {
      es: ['logro', 'trofeo', 'ganar', 'reto', 'meta', 'competicion', 'victoria'],
      en: ['achievement', 'trophy', 'win', 'challenge', 'goal', 'competition', 'victory'],
    },
  },
  {
    name: 'timer',
    category: 'fitness',
    labels: { es: 'Cronometro', en: 'Timer' },
    keywords: {
      es: ['cronometro', 'tiempo', 'temporizador', 'intervalos', 'hiit', 'duracion'],
      en: ['timer', 'time', 'stopwatch', 'intervals', 'hiit', 'duration'],
    },
  },
  {
    name: 'activity',
    category: 'fitness',
    labels: { es: 'Cardio', en: 'Cardio' },
    keywords: {
      es: ['cardio', 'actividad', 'pulsaciones', 'ritmo', 'movimiento', 'entrenamiento'],
      en: ['cardio', 'activity', 'heart rate', 'pace', 'movement', 'training'],
    },
  },
  {
    name: 'flame',
    category: 'fitness',
    labels: { es: 'Calorias', en: 'Calories' },
    keywords: {
      es: ['calorias', 'quemar', 'fuego', 'racha', 'intensidad', 'metabolismo'],
      en: ['calories', 'burn', 'fire', 'streak', 'intensity', 'metabolism'],
    },
  },
  {
    name: 'mountain',
    category: 'fitness',
    labels: { es: 'Senderismo', en: 'Hiking' },
    keywords: {
      es: ['senderismo', 'montana', 'excursion', 'trekking', 'ruta', 'escalada', 'naturaleza'],
      en: ['hiking', 'mountain', 'trek', 'trail', 'climb', 'outdoors', 'nature'],
    },
  },
  {
    name: 'brain',
    category: 'mind',
    labels: { es: 'Mente', en: 'Mind' },
    keywords: {
      es: ['mente', 'cerebro', 'memoria', 'concentracion', 'pensar', 'mental', 'psicologia'],
      en: ['mind', 'brain', 'memory', 'focus', 'think', 'mental', 'psychology'],
    },
  },
  {
    name: 'flower',
    category: 'mind',
    labels: { es: 'Meditacion', en: 'Meditation' },
    keywords: {
      es: ['meditacion', 'meditar', 'loto', 'zen', 'calma', 'mindfulness', 'relajacion', 'yoga'],
      en: ['meditation', 'meditate', 'lotus', 'zen', 'calm', 'mindfulness', 'relax', 'yoga'],
    },
  },
  {
    name: 'book-open',
    category: 'mind',
    labels: { es: 'Lectura', en: 'Reading' },
    keywords: {
      es: ['leer', 'lectura', 'libro', 'novela', 'paginas', 'capitulo', 'leer un libro'],
      en: ['read', 'reading', 'book', 'novel', 'pages', 'chapter'],
    },
  },
  {
    name: 'notebook-pen',
    category: 'mind',
    labels: { es: 'Diario', en: 'Journal' },
    keywords: {
      es: ['diario', 'escribir', 'escritura', 'cuaderno', 'notas', 'journaling', 'apuntar'],
      en: ['journal', 'write', 'writing', 'notebook', 'notes', 'journaling', 'diary'],
    },
  },
  {
    name: 'graduation-cap',
    category: 'mind',
    labels: { es: 'Estudiar', en: 'Study' },
    keywords: {
      es: ['estudiar', 'estudio', 'clase', 'universidad', 'examen', 'curso', 'aprender'],
      en: ['study', 'school', 'class', 'university', 'exam', 'course', 'learn'],
    },
  },
  {
    name: 'languages',
    category: 'mind',
    labels: { es: 'Idiomas', en: 'Languages' },
    keywords: {
      es: ['idioma', 'idiomas', 'ingles', 'traducir', 'vocabulario', 'practicar idioma'],
      en: ['language', 'languages', 'english', 'translate', 'vocabulary', 'practice language'],
    },
  },
  {
    name: 'library',
    category: 'mind',
    labels: { es: 'Biblioteca', en: 'Library' },
    keywords: {
      es: ['biblioteca', 'libros', 'estanteria', 'coleccion', 'lectura'],
      en: ['library', 'books', 'shelf', 'collection', 'reading'],
    },
  },
  {
    name: 'headphones',
    category: 'mind',
    labels: { es: 'Podcast', en: 'Podcast' },
    keywords: {
      es: ['podcast', 'audio', 'auriculares', 'cascos', 'audiolibro', 'escuchar'],
      en: ['podcast', 'audio', 'headphones', 'audiobook', 'listen'],
    },
  },
  {
    name: 'sparkles',
    category: 'mind',
    labels: { es: 'Gratitud', en: 'Gratitude' },
    keywords: {
      es: ['gratitud', 'agradecer', 'positivo', 'inspiracion', 'brillo', 'motivacion'],
      en: ['gratitude', 'thankful', 'positive', 'inspiration', 'sparkle', 'motivation'],
    },
  },
  {
    name: 'infinity',
    category: 'mind',
    labels: { es: 'Respiracion', en: 'Breathing' },
    keywords: {
      es: ['respirar', 'respiracion', 'calma', 'ansiedad', 'infinito', 'pausa'],
      en: ['breathe', 'breathing', 'calm', 'anxiety', 'infinity', 'pause'],
    },
  },
  {
    name: 'smile',
    category: 'mind',
    labels: { es: 'Animo', en: 'Mood' },
    keywords: {
      es: ['animo', 'humor', 'feliz', 'estado de animo', 'sonrisa', 'emociones'],
      en: ['mood', 'happy', 'smile', 'feelings', 'emotions', 'wellbeing'],
    },
  },
  {
    name: 'briefcase',
    category: 'work',
    labels: { es: 'Trabajo', en: 'Work' },
    keywords: {
      es: ['trabajo', 'curro', 'oficina', 'maletin', 'empleo', 'jornada laboral'],
      en: ['work', 'job', 'office', 'briefcase', 'career', 'workday'],
    },
  },
  {
    name: 'laptop',
    category: 'work',
    labels: { es: 'Portatil', en: 'Laptop' },
    keywords: {
      es: ['portatil', 'ordenador', 'laptop', 'teletrabajo', 'remoto', 'pc'],
      en: ['laptop', 'computer', 'remote work', 'wfh', 'pc', 'macbook'],
    },
  },
  {
    name: 'code',
    category: 'work',
    labels: { es: 'Programar', en: 'Coding' },
    keywords: {
      es: ['programar', 'codigo', 'desarrollo', 'software', 'coding', 'dev', 'proyecto'],
      en: ['code', 'coding', 'programming', 'development', 'software', 'dev', 'project'],
    },
  },
  {
    name: 'monitor',
    category: 'work',
    labels: { es: 'Escritorio', en: 'Desk' },
    keywords: {
      es: ['escritorio', 'pantalla', 'monitor', 'puesto', 'ordenador de mesa'],
      en: ['desk', 'screen', 'monitor', 'workstation', 'desktop'],
    },
  },
  {
    name: 'presentation',
    category: 'work',
    labels: { es: 'Presentacion', en: 'Presentation' },
    keywords: {
      es: ['presentacion', 'reunion', 'pizarra', 'exponer', 'slides', 'charla'],
      en: ['presentation', 'meeting', 'board', 'slides', 'talk', 'pitch'],
    },
  },
  {
    name: 'chart-column',
    category: 'work',
    labels: { es: 'Informes', en: 'Reports' },
    keywords: {
      es: ['informe', 'grafico', 'estadisticas', 'metricas', 'datos', 'analisis', 'ventas'],
      en: ['report', 'chart', 'stats', 'metrics', 'data', 'analytics', 'sales'],
    },
  },
  {
    name: 'clipboard-list',
    category: 'work',
    labels: { es: 'Tareas', en: 'Tasks' },
    keywords: {
      es: ['tareas', 'lista', 'pendientes', 'checklist', 'to do', 'organizar'],
      en: ['tasks', 'list', 'todo', 'checklist', 'backlog', 'organize'],
    },
  },
  {
    name: 'mail',
    category: 'work',
    labels: { es: 'Correo', en: 'Email' },
    keywords: {
      es: ['correo', 'email', 'mail', 'bandeja', 'mensajes', 'responder correos'],
      en: ['email', 'mail', 'inbox', 'messages', 'reply', 'newsletter'],
    },
  },
  {
    name: 'calendar-days',
    category: 'work',
    labels: { es: 'Agenda', en: 'Schedule' },
    keywords: {
      es: ['agenda', 'calendario', 'planificar', 'citas', 'horario', 'planning'],
      en: ['schedule', 'calendar', 'plan', 'appointments', 'agenda', 'planning'],
    },
  },
  {
    name: 'building-2',
    category: 'work',
    labels: { es: 'Oficina', en: 'Office' },
    keywords: {
      es: ['oficina', 'empresa', 'edificio', 'trabajo presencial', 'corporativo'],
      en: ['office', 'company', 'building', 'onsite', 'corporate'],
    },
  },
  {
    name: 'file-text',
    category: 'work',
    labels: { es: 'Documento', en: 'Document' },
    keywords: {
      es: ['documento', 'archivo', 'informe', 'papeleo', 'contrato', 'redactar'],
      en: ['document', 'file', 'paperwork', 'contract', 'draft', 'report'],
    },
  },
  {
    name: 'users',
    category: 'social',
    labels: { es: 'Amigos', en: 'Friends' },
    keywords: {
      es: ['amigos', 'gente', 'grupo', 'quedada', 'equipo', 'socializar', 'ver amigos'],
      en: ['friends', 'people', 'group', 'hangout', 'team', 'socialize'],
    },
  },
  {
    name: 'user-plus',
    category: 'social',
    labels: { es: 'Conocer gente', en: 'Meet people' },
    keywords: {
      es: ['conocer gente', 'nuevo amigo', 'anadir', 'contacto', 'networking', 'invitar'],
      en: ['meet people', 'new friend', 'add', 'contact', 'networking', 'invite'],
    },
  },
  {
    name: 'message-circle',
    category: 'social',
    labels: { es: 'Mensajes', en: 'Messages' },
    keywords: {
      es: ['mensaje', 'chat', 'hablar', 'conversacion', 'whatsapp', 'escribir a alguien'],
      en: ['message', 'chat', 'talk', 'conversation', 'text', 'dm'],
    },
  },
  {
    name: 'phone-call',
    category: 'social',
    labels: { es: 'Llamada', en: 'Call' },
    keywords: {
      es: ['llamada', 'llamar', 'telefono', 'movil', 'llamar a familia', 'telefonear'],
      en: ['call', 'phone', 'ring', 'mobile', 'call family', 'dial'],
    },
  },
  {
    name: 'video',
    category: 'social',
    labels: { es: 'Videollamada', en: 'Video call' },
    keywords: {
      es: ['videollamada', 'video', 'zoom', 'meet', 'camara', 'reunion online'],
      en: ['video call', 'video', 'zoom', 'meet', 'camera', 'online meeting'],
    },
  },
  {
    name: 'handshake',
    category: 'social',
    labels: { es: 'Reunion', en: 'Meeting' },
    keywords: {
      es: ['reunion', 'acuerdo', 'apreton', 'colaborar', 'trato', 'presentarse'],
      en: ['meeting', 'agreement', 'handshake', 'collaborate', 'deal', 'intro'],
    },
  },
  {
    name: 'party-popper',
    category: 'social',
    labels: { es: 'Fiesta', en: 'Party' },
    keywords: {
      es: ['fiesta', 'celebrar', 'celebracion', 'cumpleanos', 'salir de fiesta', 'evento'],
      en: ['party', 'celebrate', 'celebration', 'birthday', 'night out', 'event'],
    },
  },
  {
    name: 'gift',
    category: 'social',
    labels: { es: 'Regalo', en: 'Gift' },
    keywords: {
      es: ['regalo', 'obsequio', 'sorpresa', 'detalle', 'cumpleanos', 'navidad'],
      en: ['gift', 'present', 'surprise', 'birthday', 'christmas'],
    },
  },
  {
    name: 'heart-handshake',
    category: 'social',
    labels: { es: 'Voluntariado', en: 'Volunteering' },
    keywords: {
      es: ['voluntariado', 'ayudar', 'solidaridad', 'donar', 'apoyo', 'cuidar'],
      en: ['volunteering', 'help', 'charity', 'donate', 'support', 'care'],
    },
  },
  {
    name: 'baby',
    category: 'social',
    labels: { es: 'Familia', en: 'Family' },
    keywords: {
      es: ['familia', 'bebe', 'hijos', 'ninos', 'crianza', 'padres'],
      en: ['family', 'baby', 'kids', 'children', 'parenting', 'parents'],
    },
  },
  {
    name: 'house',
    category: 'home',
    labels: { es: 'Casa', en: 'Home' },
    keywords: {
      es: ['casa', 'hogar', 'vivienda', 'domestico', 'en casa'],
      en: ['home', 'house', 'household', 'domestic', 'at home'],
    },
  },
  {
    name: 'brush-cleaning',
    category: 'home',
    labels: { es: 'Limpieza', en: 'Cleaning' },
    keywords: {
      es: ['limpiar', 'limpieza', 'barrer', 'escoba', 'ordenar', 'fregar', 'tareas de casa'],
      en: ['clean', 'cleaning', 'sweep', 'broom', 'tidy', 'chores', 'housework'],
    },
  },
  {
    name: 'washing-machine',
    category: 'home',
    labels: { es: 'Lavadora', en: 'Laundry' },
    keywords: {
      es: ['lavadora', 'colada', 'lavar ropa', 'tender', 'ropa sucia'],
      en: ['laundry', 'washing machine', 'wash clothes', 'dryer', 'linens'],
    },
  },
  {
    name: 'trash-2',
    category: 'home',
    labels: { es: 'Basura', en: 'Trash' },
    keywords: {
      es: ['basura', 'sacar la basura', 'cubo', 'residuos', 'papelera', 'tirar'],
      en: ['trash', 'take out trash', 'bin', 'garbage', 'waste', 'throw away'],
    },
  },
  {
    name: 'sofa',
    category: 'home',
    labels: { es: 'Descanso', en: 'Lounge' },
    keywords: {
      es: ['sofa', 'descansar', 'relajarse', 'salon', 'tiempo libre', 'tumbarse'],
      en: ['sofa', 'couch', 'relax', 'lounge', 'living room', 'chill'],
    },
  },
  {
    name: 'bed-double',
    category: 'home',
    labels: { es: 'Hacer la cama', en: 'Make the bed' },
    keywords: {
      es: ['hacer la cama', 'cama', 'dormitorio', 'sabanas', 'habitacion'],
      en: ['make the bed', 'bed', 'bedroom', 'sheets', 'room'],
    },
  },
  {
    name: 'lamp',
    category: 'home',
    labels: { es: 'Lampara', en: 'Lamp' },
    keywords: {
      es: ['lampara', 'luz', 'iluminacion', 'bombilla', 'apagar luces'],
      en: ['lamp', 'light', 'lighting', 'bulb', 'turn off lights'],
    },
  },
  {
    name: 'hammer',
    category: 'home',
    labels: { es: 'Bricolaje', en: 'DIY' },
    keywords: {
      es: ['bricolaje', 'martillo', 'reforma', 'montar', 'obra', 'manitas'],
      en: ['diy', 'hammer', 'build', 'renovation', 'handyman', 'assemble'],
    },
  },
  {
    name: 'wrench',
    category: 'home',
    labels: { es: 'Reparacion', en: 'Repair' },
    keywords: {
      es: ['reparar', 'arreglar', 'llave inglesa', 'mantenimiento', 'averia', 'fontanero'],
      en: ['repair', 'fix', 'wrench', 'maintenance', 'broken', 'plumbing'],
    },
  },
  {
    name: 'spray-can',
    category: 'home',
    labels: { es: 'Desinfectar', en: 'Disinfect' },
    keywords: {
      es: ['desinfectar', 'spray', 'limpiar superficies', 'producto', 'higiene'],
      en: ['disinfect', 'spray', 'clean surfaces', 'sanitize', 'hygiene'],
    },
  },
  {
    name: 'shirt',
    category: 'home',
    labels: { es: 'Ropa', en: 'Clothes' },
    keywords: {
      es: ['ropa', 'camiseta', 'vestirse', 'planchar', 'armario', 'doblar ropa'],
      en: ['clothes', 'shirt', 'dress', 'iron', 'wardrobe', 'fold clothes'],
    },
  },
  {
    name: 'sprout',
    category: 'home',
    labels: { es: 'Plantas', en: 'Plants' },
    keywords: {
      es: ['plantas', 'regar', 'jardin', 'brote', 'huerto', 'maceta', 'cuidar plantas'],
      en: ['plants', 'water plants', 'garden', 'sprout', 'seedling', 'pot'],
    },
  },
  {
    name: 'plane',
    category: 'travel',
    labels: { es: 'Avion', en: 'Flight' },
    keywords: {
      es: ['avion', 'vuelo', 'viaje', 'aeropuerto', 'volar', 'viajar'],
      en: ['plane', 'flight', 'travel', 'airport', 'fly', 'trip'],
    },
  },
  {
    name: 'car',
    category: 'travel',
    labels: { es: 'Coche', en: 'Car' },
    keywords: {
      es: ['coche', 'carro', 'auto', 'conducir', 'viaje en coche', 'carretera'],
      en: ['car', 'drive', 'driving', 'road trip', 'vehicle', 'commute'],
    },
  },
  {
    name: 'train-front',
    category: 'travel',
    labels: { es: 'Tren', en: 'Train' },
    keywords: {
      es: ['tren', 'estacion', 'metro', 'cercanias', 'ave', 'railes'],
      en: ['train', 'station', 'subway', 'metro', 'rail', 'commute'],
    },
  },
  {
    name: 'bus',
    category: 'travel',
    labels: { es: 'Autobus', en: 'Bus' },
    keywords: {
      es: ['autobus', 'bus', 'transporte publico', 'parada', 'linea'],
      en: ['bus', 'coach', 'public transport', 'stop', 'shuttle'],
    },
  },
  {
    name: 'ship',
    category: 'travel',
    labels: { es: 'Barco', en: 'Boat' },
    keywords: {
      es: ['barco', 'ferry', 'crucero', 'navegar', 'puerto'],
      en: ['boat', 'ship', 'ferry', 'cruise', 'sail', 'port'],
    },
  },
  {
    name: 'map',
    category: 'travel',
    labels: { es: 'Mapa', en: 'Map' },
    keywords: {
      es: ['mapa', 'ruta', 'itinerario', 'explorar', 'planear viaje'],
      en: ['map', 'route', 'itinerary', 'explore', 'plan trip'],
    },
  },
  {
    name: 'map-pin',
    category: 'travel',
    labels: { es: 'Lugar', en: 'Place' },
    keywords: {
      es: ['lugar', 'sitio', 'ubicacion', 'destino', 'marcador', 'visitar'],
      en: ['place', 'location', 'destination', 'pin', 'spot', 'visit'],
    },
  },
  {
    name: 'compass',
    category: 'travel',
    labels: { es: 'Brujula', en: 'Compass' },
    keywords: {
      es: ['brujula', 'orientacion', 'aventura', 'explorar', 'norte', 'descubrir'],
      en: ['compass', 'direction', 'adventure', 'explore', 'north', 'discover'],
    },
  },
  {
    name: 'luggage',
    category: 'travel',
    labels: { es: 'Equipaje', en: 'Luggage' },
    keywords: {
      es: ['equipaje', 'maleta', 'hacer la maleta', 'viaje', 'mochila'],
      en: ['luggage', 'suitcase', 'pack', 'travel', 'baggage'],
    },
  },
  {
    name: 'tent-tree',
    category: 'travel',
    labels: { es: 'Camping', en: 'Camping' },
    keywords: {
      es: ['camping', 'acampada', 'tienda', 'naturaleza', 'aire libre', 'campamento'],
      en: ['camping', 'tent', 'campsite', 'nature', 'outdoors', 'wilderness'],
    },
  },
  {
    name: 'tree-palm',
    category: 'travel',
    labels: { es: 'Playa', en: 'Beach' },
    keywords: {
      es: ['playa', 'palmera', 'vacaciones', 'verano', 'tropical', 'descanso'],
      en: ['beach', 'palm', 'vacation', 'holiday', 'summer', 'tropical'],
    },
  },
  {
    name: 'music',
    category: 'hobby',
    labels: { es: 'Musica', en: 'Music' },
    keywords: {
      es: ['musica', 'cancion', 'escuchar musica', 'playlist', 'nota', 'spotify'],
      en: ['music', 'song', 'listen music', 'playlist', 'note', 'tunes'],
    },
  },
  {
    name: 'guitar',
    category: 'hobby',
    labels: { es: 'Guitarra', en: 'Guitar' },
    keywords: {
      es: ['guitarra', 'tocar', 'instrumento', 'ensayar', 'acordes', 'musica'],
      en: ['guitar', 'play', 'instrument', 'practice', 'chords', 'music'],
    },
  },
  {
    name: 'piano',
    category: 'hobby',
    labels: { es: 'Piano', en: 'Piano' },
    keywords: {
      es: ['piano', 'teclado', 'tocar', 'instrumento', 'solfeo', 'clases de musica'],
      en: ['piano', 'keyboard', 'play', 'instrument', 'keys', 'music lessons'],
    },
  },
  {
    name: 'mic-vocal',
    category: 'hobby',
    labels: { es: 'Cantar', en: 'Singing' },
    keywords: {
      es: ['cantar', 'canto', 'microfono', 'karaoke', 'voz', 'coro'],
      en: ['sing', 'singing', 'mic', 'karaoke', 'voice', 'choir'],
    },
  },
  {
    name: 'gamepad-2',
    category: 'hobby',
    labels: { es: 'Videojuegos', en: 'Gaming' },
    keywords: {
      es: ['videojuegos', 'jugar', 'mando', 'consola', 'gaming', 'partida', 'ps5'],
      en: ['video games', 'gaming', 'controller', 'console', 'play', 'gamepad'],
    },
  },
  {
    name: 'film',
    category: 'hobby',
    labels: { es: 'Cine', en: 'Movies' },
    keywords: {
      es: ['cine', 'pelicula', 'ver pelicula', 'peliculas', 'film', 'estreno'],
      en: ['movie', 'movies', 'cinema', 'film', 'watch movie', 'screening'],
    },
  },
  {
    name: 'clapperboard',
    category: 'hobby',
    labels: { es: 'Series', en: 'Series' },
    keywords: {
      es: ['series', 'serie', 'netflix', 'capitulo', 'maraton', 'streaming'],
      en: ['series', 'show', 'netflix', 'episode', 'binge', 'streaming'],
    },
  },
  {
    name: 'tv',
    category: 'hobby',
    labels: { es: 'Television', en: 'TV' },
    keywords: {
      es: ['television', 'tele', 'tv', 'ver la tele', 'pantalla', 'programa'],
      en: ['tv', 'television', 'watch tv', 'screen', 'show', 'broadcast'],
    },
  },
  {
    name: 'camera',
    category: 'hobby',
    labels: { es: 'Fotografia', en: 'Photography' },
    keywords: {
      es: ['foto', 'fotos', 'fotografia', 'camara', 'hacer fotos', 'retrato'],
      en: ['photo', 'photos', 'photography', 'camera', 'take photos', 'portrait'],
    },
  },
  {
    name: 'palette',
    category: 'hobby',
    labels: { es: 'Pintar', en: 'Painting' },
    keywords: {
      es: ['pintar', 'pintura', 'dibujar', 'arte', 'paleta', 'colores', 'creatividad'],
      en: ['paint', 'painting', 'draw', 'art', 'palette', 'colors', 'creative'],
    },
  },
  {
    name: 'puzzle',
    category: 'hobby',
    labels: { es: 'Puzzle', en: 'Puzzle' },
    keywords: {
      es: ['puzzle', 'rompecabezas', 'piezas', 'acertijo', 'logica', 'pasatiempo'],
      en: ['puzzle', 'jigsaw', 'pieces', 'riddle', 'logic', 'brain teaser'],
    },
  },
  {
    name: 'dices',
    category: 'hobby',
    labels: { es: 'Juegos de mesa', en: 'Board games' },
    keywords: {
      es: ['juegos de mesa', 'dados', 'jugar', 'cartas', 'rol', 'partida'],
      en: ['board games', 'dice', 'play', 'cards', 'tabletop', 'game night'],
    },
  },
  {
    name: 'scissors',
    category: 'hobby',
    labels: { es: 'Manualidades', en: 'Crafts' },
    keywords: {
      es: ['manualidades', 'tijeras', 'cortar', 'diy', 'coser', 'artesania'],
      en: ['crafts', 'scissors', 'cut', 'diy', 'sewing', 'handmade'],
    },
  },
  {
    name: 'circle-dot',
    category: 'other',
    labels: { es: 'General', en: 'General' },
    keywords: {
      es: ['general', 'generico', 'punto', 'circulo', 'otro', 'habito', 'por defecto'],
      en: ['general', 'generic', 'dot', 'circle', 'other', 'habit', 'default'],
    },
  },
  {
    name: 'star',
    category: 'other',
    labels: { es: 'Favorito', en: 'Favorite' },
    keywords: {
      es: ['favorito', 'estrella', 'destacado', 'importante', 'valorar'],
      en: ['favorite', 'star', 'featured', 'important', 'rate'],
    },
  },
  {
    name: 'shopping-cart',
    category: 'other',
    labels: { es: 'Compras', en: 'Shopping' },
    keywords: {
      es: ['compras', 'comprar', 'carrito', 'tienda', 'pedido', 'ir de compras'],
      en: ['shopping', 'buy', 'cart', 'store', 'order', 'go shopping'],
    },
  },
  {
    name: 'shopping-basket',
    category: 'other',
    labels: { es: 'Supermercado', en: 'Groceries' },
    keywords: {
      es: ['supermercado', 'super', 'cesta', 'compra semanal', 'alimentacion', 'mercado'],
      en: ['groceries', 'supermarket', 'basket', 'weekly shop', 'market', 'food shop'],
    },
  },
  {
    name: 'credit-card',
    category: 'other',
    labels: { es: 'Tarjeta', en: 'Card' },
    keywords: {
      es: ['tarjeta', 'pago', 'pagar', 'credito', 'banco', 'cobro'],
      en: ['card', 'payment', 'pay', 'credit', 'bank', 'checkout'],
    },
  },
  {
    name: 'wallet',
    category: 'other',
    labels: { es: 'Cartera', en: 'Wallet' },
    keywords: {
      es: ['cartera', 'monedero', 'presupuesto', 'gastos', 'billetera'],
      en: ['wallet', 'purse', 'budget', 'expenses', 'spending'],
    },
  },
  {
    name: 'piggy-bank',
    category: 'other',
    labels: { es: 'Ahorro', en: 'Savings' },
    keywords: {
      es: ['ahorro', 'ahorrar', 'hucha', 'guardar dinero', 'finanzas', 'meta de ahorro'],
      en: ['savings', 'save money', 'piggy bank', 'finance', 'saving goal'],
    },
  },
  {
    name: 'coins',
    category: 'other',
    labels: { es: 'Dinero', en: 'Money' },
    keywords: {
      es: ['dinero', 'monedas', 'pasta', 'ingresos', 'euros', 'finanzas'],
      en: ['money', 'coins', 'cash', 'income', 'currency', 'finance'],
    },
  },
  {
    name: 'banknote',
    category: 'other',
    labels: { es: 'Gasto', en: 'Expense' },
    keywords: {
      es: ['gasto', 'billete', 'efectivo', 'presupuesto', 'factura', 'pagar'],
      en: ['expense', 'banknote', 'cash', 'budget', 'bill', 'spend'],
    },
  },
  {
    name: 'dog',
    category: 'other',
    labels: { es: 'Perro', en: 'Dog' },
    keywords: {
      es: ['perro', 'pasear al perro', 'mascota', 'can', 'cachorro'],
      en: ['dog', 'walk the dog', 'pet', 'puppy', 'canine'],
    },
  },
  {
    name: 'cat',
    category: 'other',
    labels: { es: 'Gato', en: 'Cat' },
    keywords: {
      es: ['gato', 'mascota', 'gatito', 'felino', 'arenero'],
      en: ['cat', 'pet', 'kitten', 'feline', 'litter box'],
    },
  },
  {
    name: 'paw-print',
    category: 'other',
    labels: { es: 'Mascota', en: 'Pet' },
    keywords: {
      es: ['mascota', 'animal', 'huella', 'pata', 'cuidar mascota', 'veterinario'],
      en: ['pet', 'animal', 'paw', 'print', 'pet care', 'vet'],
    },
  },
  {
    name: 'cigarette',
    category: 'other',
    labels: { es: 'Fumar', en: 'Smoking' },
    keywords: {
      es: ['fumar', 'tabaco', 'cigarro', 'cigarrillo', 'vicio', 'habito a evitar'],
      en: ['smoking', 'smoke', 'tobacco', 'cigarette', 'bad habit', 'avoid'],
    },
  },
]

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

const searchIndex = new Map<string, string>(
  ICON_CATALOG.map((icon) => [
    icon.name,
    normalizeText(
      [
        icon.name.replace(/-/g, ' '),
        icon.name,
        icon.labels.es,
        icon.labels.en,
        icon.keywords.es.join(' '),
        icon.keywords.en.join(' '),
      ].join(' '),
    ),
  ]),
)

const knownIconNames = new Set<string>(ICON_CATALOG.map((icon) => icon.name))

export function isKnownIcon(name: string): boolean {
  return knownIconNames.has(name)
}

const rankMatch = (icon: CatalogIcon, query: string, locale: 'es' | 'en'): number => {
  const otherLocale = locale === 'es' ? 'en' : 'es'
  if (normalizeText(icon.labels[locale]).startsWith(query)) return 0
  if (normalizeText(icon.labels[otherLocale]).startsWith(query)) return 1
  if (icon.name.startsWith(query)) return 2
  if (icon.keywords[locale].some((keyword) => normalizeText(keyword).startsWith(query))) return 3
  if (icon.keywords[otherLocale].some((keyword) => normalizeText(keyword).startsWith(query))) return 4
  return 5
}

export function findIcons(query: string, locale: 'es' | 'en', category?: IconCategory): CatalogIcon[] {
  const pool = category
    ? ICON_CATALOG.filter((icon) => icon.category === category)
    : ICON_CATALOG.slice()

  const normalizedQuery = normalizeText(query)
  if (normalizedQuery.length === 0) return pool

  const terms = normalizedQuery.split(/\s+/).filter((term) => term.length > 0)

  return pool
    .filter((icon) => {
      const haystack = searchIndex.get(icon.name) ?? ''
      return terms.every((term) => haystack.includes(term))
    })
    .map((icon, index) => ({ icon, index, rank: rankMatch(icon, normalizedQuery, locale) }))
    .sort((a, b) => (a.rank === b.rank ? a.index - b.index : a.rank - b.rank))
    .map((entry) => entry.icon)
}
