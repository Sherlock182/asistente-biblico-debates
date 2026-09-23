<div align="center">

<img src="assets/icon.png" alt="Asistente Bíblico en Debates" width="160" />

# Asistente Bíblico en Debates

**Verifica en tiempo real, contra la Reina-Valera 1960, lo que se afirma en un debate.**

[![Descargar APK](https://img.shields.io/github/v/release/Sherlock182/asistente-biblico-debates?style=for-the-badge&label=Descargar%20APK&color=D9B65C&logo=android&logoColor=black)](../../releases/latest)
[![Expo SDK 57](https://img.shields.io/badge/Expo%20SDK-57-000020?style=for-the-badge&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev)
[![Licencia MIT](https://img.shields.io/badge/Licencia-MIT-2BB673?style=for-the-badge)](LICENSE)

</div>

---

## Qué hace

Es un asistente para debates religiosos. Escucha la conversación por el micrófono, transcribe lo que dice la otra persona, extrae sus afirmaciones doctrinales y las contrasta contra el texto completo de la **Biblia Reina-Valera 1960**, que viene incluido dentro de la aplicación.

Por cada afirmación entrega un veredicto —**FALSO**, **VERDADERO**, **PARCIAL** o **SIN BASE CLARA**—, una explicación de una línea y los versículos que lo respaldan.

> **Garantía de fidelidad al texto:** los modelos de lenguaje parafrasean citas bíblicas con facilidad. Por eso cada versículo que genera la IA se compara contra los 31 099 versículos almacenados en el dispositivo **antes de mostrarse**. Si el texto fue alterado, se reemplaza por el auténtico y se avisa; si la referencia no existe, se marca como inválida. Lo que ves en pantalla proviene siempre del texto local, nunca del modelo.

---

## Funcionalidades

### Escucha y análisis

| | |
|---|---|
| **Escucha continua** | Graba en tomas de 10 s y las acumula hasta completar la ventana elegida (15–90 s), para analizar argumentos completos y no frases sueltas. |
| **Corte por pausa** | Si la persona deja de hablar, analiza de inmediato sin esperar a que se cumpla el tiempo. |
| **Triaje de afirmaciones** | Descarta saludos, muletillas y ruido antes de gastar una llamada a la API. |
| **Dos modos** | *En vivo*: veredicto de cada bloque mientras habla. *Al detener*: solo transcribe y analiza todo al parar. |
| **Editar transcripción** | Si el micrófono entiende mal, se corrige el texto y se vuelve a analizar. |

### Razonamiento

| | |
|---|---|
| **Destilado de la afirmación** | Convierte el habla real («bueno este yo creo que pues…») en la tesis limpia antes de buscar. |
| **Expansión de vocabulario** | Genera los sinónimos que usaría la RV1960, de modo que «perder la salvación» también encuentre *apostasía*, *perseverancia* o *caer de la gracia*. |
| **Búsqueda ponderada** | Índice invertido con raíz de palabra, pesado por rareza del término (idf), cobertura de la afirmación y normalización por longitud del versículo. |
| **Filtro de relevancia** | Un segundo paso razona cuáles de los candidatos tratan realmente el tema y los ordena del más claro al menos. |
| **Contexto del pasaje** | Adjunta los versículos vecinos para evitar citas fuera de contexto. |
| **Verificación de citas** | Toda cita se coteja contra el texto local antes de mostrarse. |
| **Detección de contradicciones** | Avisa si la persona contradice algo que ella misma afirmó antes en la misma sesión. |
| **Marco doctrinal** | Identifica la postura del interlocutor y adapta las réplicas a sus argumentos típicos. |

### Herramientas

- **Lector bíblico completo** — 66 libros, navegación por capítulos y lectura con tipografía de página impresa. Tocar cualquier cita salta al versículo resaltado en su capítulo.
- **Argumentos bajo demanda** — botones *En contra*, *A favor* y *¿Qué me dirá?* (anticipa el contraargumento del oponente y prepara la réplica).
- **Texto a voz** — lectura de versículos y capítulos; opción de narrar el veredicto automáticamente, solo con audífonos o siempre.
- **Historial de debates** — cada sesión se guarda en el dispositivo.
- **Modo discreto** — muestra solo el veredicto; la vibración distingue falso, verdadero y parcial sin mirar la pantalla.
- **Copiar al portapapeles** — cualquier versículo, con un toque.

---

## Instalación

### Usuarios de Android

1. Descarga la APK desde la [**última versión publicada**](../../releases/latest).
2. Ábrela en el teléfono y autoriza la instalación desde orígenes desconocidos cuando Android lo pida.
3. Abre la app, entra en **Ajustes** y pega tu clave de API de Groq.

### Clave de API

La app usa [Groq](https://console.groq.com/keys), cuyo nivel gratuito cubre el uso normal. La clave se guarda **cifrada en el propio dispositivo** mediante `expo-secure-store`: no viaja a ningún servidor propio ni queda escrita en el código.

---

## Ejecutar el proyecto

```bash
git clone https://github.com/Sherlock182/asistente-biblico-debates.git
cd asistente-biblico-debates
npm install
npx expo start
```

Escanea el código QR con [Expo Go](https://expo.dev/go) (requiere SDK 57).

### Compilar una APK

```bash
npx eas-cli login
npx eas-cli build -p android --profile preview
```

---

## Arquitectura

```
App.js                      Pantalla principal: escucha, acumulación y estado
src/
├── components/
│   ├── AboutModal.js       Créditos y contacto
│   ├── BibleReaderModal.js Lector de los 66 libros
│   ├── BrandSplash.js      Presentación de apertura
│   ├── ChatBubble.js       Veredictos, citas y acciones
│   ├── EditClaimModal.js   Corrección de transcripciones
│   ├── EmptyState.js       Pantalla inicial
│   ├── ListeningIndicator.js
│   ├── SessionsModal.js    Historial de debates
│   └── SettingsModal.js    Configuración
├── services/
│   ├── audioOutput.js      Detección de audífonos
│   ├── bible.js            Índice de búsqueda y acceso al texto
│   ├── citationCheck.js    Verificación de citas
│   ├── debateAssistant.js  Triaje, selección y veredicto
│   ├── groq.js             Transcripción y modelo de lenguaje
│   ├── secureStore.js      Almacenamiento cifrado de la clave
│   └── sessionStore.js     Persistencia de sesiones
├── utils/
│   └── parseVerdictReply.js
├── data/
│   └── rv1960.json         Texto completo (66 libros, 31 099 versículos)
└── theme.js                Sistema de diseño
```

### Cómo se procesa una afirmación

```
Audio (tomas de 10 s)
   └─> Transcripción            Whisper large-v3
        └─> Acumulación         hasta completar la ventana o detectar pausa
             └─> Triaje         ¿es afirmación? · tema · sinónimos · contradicción · postura
                  └─> Búsqueda  local sobre 31 099 versículos, sin conexión
                       └─> Selección por relevancia
                            └─> Veredicto con contexto del pasaje
                                 └─> Verificación contra el texto local
                                      └─> Pantalla
```

### Tecnologías

| Componente | Herramienta |
|---|---|
| Plataforma | Expo SDK 57 · React Native 0.86 |
| Transcripción | Groq · Whisper large-v3 |
| Razonamiento | Groq · Qwen 3.8 27B |
| Búsqueda bíblica | Índice propio en el dispositivo, sin conexión |
| Almacenamiento | `expo-secure-store` · `AsyncStorage` |
| Compilación | EAS Build |

---

## Privacidad

- El texto bíblico y toda la búsqueda funcionan **sin conexión**, dentro del teléfono.
- El audio se envía a Groq únicamente para transcribirse; no se almacena en ningún servidor propio.
- La clave de API y el historial de debates permanecen **solo en el dispositivo**.
- La aplicación no incluye analítica, rastreadores ni publicidad.

---

## Autor

**Ing. Oseas Nahun Montalvo Rogel**

[![Correo](https://img.shields.io/badge/Correo-4603642023%40mail.utec.edu.sv-D9B65C?style=flat-square&logo=gmail&logoColor=black)](mailto:4603642023@mail.utec.edu.sv)
[![GitHub](https://img.shields.io/badge/GitHub-Sherlock182-181717?style=flat-square&logo=github)](https://github.com/Sherlock182)

---

## Licencia

Código fuente bajo [licencia MIT](LICENSE). El texto de la Reina-Valera 1960 incluido en `src/data/rv1960.json` se distribuye con fines de estudio personal y no está cubierto por esa licencia.
