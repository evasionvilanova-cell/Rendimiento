# Rendimiento

App personal para ver cada mañana cómo estás: recuperación, sueño, preparación para entrenar y esfuerzo del día (estilo Whoop), con un semáforo que te dice si apretar, mantener o aflojar. Los datos vienen de **intervals.icu**, que a su vez los recibe de **Garmin Connect**.

## Pantallas
- **Hoy** (`/`): 4 anillos, semáforo con motivos, HRV de 14 días, preguntas de sensaciones (se guardan en intervals.icu), entreno planificado del día y nutrición.
- **Tendencias** (`/tendencias`): evolución de los porcentajes, carga (CTL/ATL/TSS), HRV, sueño y últimos entrenos.

## Variables de entorno (Vercel → Settings → Environment Variables)
| Variable | Obligatoria | Qué es |
|---|---|---|
| `INTERVALS_API_KEY` | Sí | Clave API de intervals.icu (Settings → Developer Settings) |
| `INTERVALS_ATHLETE_ID` | Recomendada | Tu ID de atleta, empieza por `i` (sale en la URL de intervals.icu). Si no se pone usa `0` |
| `APP_PASSWORD` | Recomendada | Contraseña para entrar en la app (sin ella cualquiera con el enlace ve tus datos) |
| `ATHLETE_NAME` | No | Nombre del saludo (por defecto Xavi) |
| `SLEEP_NEED_HOURS` | No | Horas de sueño que necesitas (por defecto 7.5) |
| `NUTRITION_URL` | No | Enlace al menú del día (por ejemplo, Pautia) |

Sin `INTERVALS_API_KEY` la app muestra datos de ejemplo.

## Cómo se calculan los porcentajes (`lib/scores.ts`)
- **Recuperación**: HRV de la noche y media de 7 días comparadas con tus últimos 60 días (en logaritmo), y pulso en reposo frente a tu media.
- **Sueño**: horas dormidas frente a las que necesitas (60 %) y nota de sueño de Garmin (40 %).
- **Listo para entrenar**: recuperación (50 %), sueño (25 %) y sensaciones (25 %), restando si la forma (TSB) está por debajo de −10 o la fatiga sube muy rápido.
- **Semáforo**: verde ≥ 67 %, amarillo 34–66 %, rojo < 34 %.
- **Esfuerzo**: TSS del día convertido a escala 0–21.

Necesita al menos 7 días con HRV para calcular tu rango; con 30–60 días es más fiable.
