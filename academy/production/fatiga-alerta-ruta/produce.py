#!/usr/bin/env python3
import asyncio
import hashlib
import json
import math
import re
import shutil
import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import edge_tts

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / "build"
OUT = ROOT / "output"
W, H, FPS = 1280, 720, 24
VOICE = "es-AR-TomasNeural"
CYAN = "#19C7E6"
WHITE = "#F5FAFC"
DARK = "#071118"
PANEL = "#0E202B"
MUTED = "#A7BBC7"
RED = "#E52B3A"
AMBER = "#FFB84D"
GREEN = "#38D996"

SCENES = [
    {
        "chapter": "Caso de apertura",
        "title": "“No recuerdo los últimos kilómetros”",
        "kind": "road",
        "bullets": ["Párpados pesados", "Una salida pasada", "Correcciones tardías"],
        "narration": """Son las cuatro y veinte de la mañana. Venís de una jornada larga, la ruta está monótona y faltan, según el tablero, cuarenta minutos para el próximo punto previsto. Pasaste una salida sin verla. En una curva corregiste un poco tarde. Y hay algo más incómodo: no recordás con claridad los últimos kilómetros. La tentación es conocida: abrir la ventanilla, subir la música y aguantar. Este curso propone otra decisión. Vamos a reconocer la fatiga antes de que se convierta en un microsueño, separar medidas reales de trucos que apenas distraen y armar un protocolo práctico para detenerse sin improvisar. No reemplaza una consulta médica ni las reglas de la empresa o de la jurisdicción: sirve para tomar decisiones seguras."""
    },
    {
        "chapter": "Microlección 1",
        "title": "La fatiga aparece antes de dormirte",
        "kind": "attention",
        "bullets": ["Atención más estrecha", "Decisiones más lentas", "Menor margen de corrección"],
        "narration": """Fatiga no significa solamente quedarse dormido. Mucho antes puede reducir la atención, enlentecer la decisión y achicar el margen para corregir. En un camión, esa pérdida de margen pesa: hay masa, distancia de frenado, tránsito alrededor y una cabina que puede sentirse estable aunque el conductor ya no esté procesando todo. Por eso el criterio no es esperar el cabeceo final. El criterio es detectar cambios respecto de tu estado normal: más esfuerzo para sostener la vista, lectura tardía de carteles, dificultad para mantener una trayectoria pareja o decisiones que antes eran automáticas y ahora demandan concentración. Una sola señal puede tener otra causa. Varias señales juntas, durante una jornada exigente, justifican actuar como si la alerta estuviera comprometida."""
    },
    {
        "chapter": "Microlección 2",
        "title": "Señales que no conviene negociar",
        "kind": "signals",
        "bullets": ["Bostezos o parpadeo frecuente", "Deriva de carril", "Salidas o carteles omitidos", "Lagunas de memoria"],
        "narration": """Las señales útiles son observables. Bostezos repetidos. Parpadeo frecuente o dificultad para mantener los ojos abiertos. Cabeza que cuesta sostener. Deriva dentro del carril o correcciones bruscas. Carteles, salidas o referencias que aparecen demasiado tarde. Y las lagunas de memoria: no poder reconstruir un tramo recién recorrido. Ninguna aplicación necesita convencerte de eso. Si tu propio registro muestra dos o más cambios, la decisión prudente es buscar una detención segura. No hace falta demostrar que estás al límite. Al contrario: cuanto antes interrumpís la exposición, más opciones conservás. El error frecuente es convertir cada señal en una discusión: “fue el viento”, “fue un pozo”, “ya falta poco”. Esa negociación consume justamente la capacidad que está disminuyendo."""
    },
    {
        "chapter": "Microlección 3",
        "title": "Hay horarios de mayor riesgo",
        "kind": "clock",
        "bullets": ["Medianoche a 6:00", "Final de la tarde", "Puede ocurrir a cualquier hora"],
        "narration": """La autoridad vial de Estados Unidos, NHTSA, identifica dos períodos comunes en siniestros asociados a somnolencia: entre medianoche y las seis de la mañana, y hacia el final de la tarde. Coinciden con descensos naturales del estado de alerta, pero no son un reloj mágico. La fatiga puede aparecer a cualquier hora si dormiste poco, acumulaste jornadas irregulares, atravesás una ruta monótona o tomaste una medicación que provoca somnolencia. Para un plan de viaje, esos períodos sirven como zonas de atención reforzada. No para prometer que fuera de ellos todo está bien. La pregunta práctica es: ¿en qué momento de mi recorrido voy a estar más expuesto y cuál es el lugar seguro anterior donde podría detenerme si las señales aparecen?"""
    },
    {
        "chapter": "Microlección 4",
        "title": "Trucos que no recuperan alerta",
        "kind": "compare",
        "bullets": ["Ventana abierta ≠ descanso", "Música fuerte ≠ recuperación", "Energizante ≠ sueño suficiente"],
        "narration": """Abrir la ventanilla, lavarse la cara, mascar chicle o subir la música pueden cambiar la sensación durante unos minutos. No recuperan el sueño perdido. El café tampoco convierte a una persona muy privada de sueño en un conductor seguro. NHTSA advierte que, aun con cafeína, pueden aparecer microsueños de pocos segundos. A velocidad de ruta, unos segundos sin procesar el entorno alcanzan para recorrer una distancia enorme sin control consciente. La cafeína puede formar parte de una medida corta y planificada, pero no debe usarse como permiso para extender una jornada que ya dio señales. Tampoco mezcles estimulantes ni improvises con medicamentos. Si una etiqueta advierte somnolencia, consultá al profesional o al farmacéutico antes de conducir."""
    },
    {
        "chapter": "Ejercicio 1",
        "title": "Decisión en el caso",
        "kind": "exercise",
        "bullets": ["Pasaste una salida", "Corregiste tarde", "No recordás el último tramo", "¿Qué hacés ahora?"],
        "pause": 6,
        "narration": """Volvamos al caso. Pasaste una salida, corregiste tarde y no recordás con claridad el último tramo. El próximo parador previsto está a cuarenta minutos, pero hay un área habilitada y segura a pocos kilómetros. Elegí una respuesta. Opción A: música fuerte y seguir hasta el plan original. Opción B: detenerte en el primer lugar seguro y reevaluar. Opción C: acelerar para reducir el tiempo de exposición. Tenés seis segundos para decidir. La respuesta es la B. Las señales ya muestran alerta deteriorada. Acelerar aumenta el costo de un error y la música no recupera capacidad. La maniobra correcta es señalizar con anticipación, salir sin apuro, estacionar en un sitio habilitado y seguro, asegurar el vehículo y recién entonces decidir el siguiente paso."""
    },
    {
        "chapter": "Microlección 5",
        "title": "Detenerse bien también es una maniobra",
        "kind": "stop",
        "bullets": ["Elegí un lugar habilitado", "Señalizá temprano", "Asegurá el vehículo", "Reevaluá antes de volver"],
        "narration": """“Parar” no significa detenerse en cualquier banquina. Si todavía tenés control, buscá el primer punto habilitado, iluminado y compatible con el tamaño del conjunto. Señalizá temprano, bajá la velocidad de forma progresiva y evitá maniobras repentinas. Una vez estacionado, aplicá el procedimiento de aseguramiento que corresponda al vehículo y al lugar. Si la somnolencia es intensa o la conducción ya es inestable, la prioridad es salir del flujo con el menor riesgo posible y pedir asistencia. No existe un único lugar correcto para todas las rutas; por eso conviene planificar alternativas antes. El objetivo es no cambiar un riesgo por otro: evitar seguir con alerta baja, pero también evitar una detención expuesta o una reincorporación apurada."""
    },
    {
        "chapter": "Microlección 6",
        "title": "La medida corta: pausa, no solución",
        "kind": "nap",
        "bullets": ["Lugar seguro", "Café si es apropiado", "Siesta corta de unos 20 min", "Efecto temporal"],
        "narration": """Como medida de corto plazo, NHTSA propone tomar una o dos tazas de café y hacer una siesta breve, de unos veinte minutos, en un lugar seguro y designado. La cafeína tarda un tiempo en actuar y la pausa puede mejorar transitoriamente el estado de alerta. La palabra clave es transitoriamente. No reemplaza dormir lo necesario ni garantiza que puedas completar el viaje. Al despertar, date tiempo para despejarte y evaluá señales concretas antes de volver. Si persisten los párpados pesados, la confusión, el cabeceo o la dificultad para enfocar, no retomes. Comunicá la demora, reorganizá la jornada o buscá relevo y asistencia. La hora de llegada nunca compensa el riesgo de circular sin capacidad suficiente."""
    },
    {
        "chapter": "Microlección 7",
        "title": "Prevención antes de arrancar",
        "kind": "plan",
        "bullets": ["7 horas o más de sueño", "Horario realista", "Medicaciones revisadas", "Alternativas de parada"],
        "narration": """La prevención más efectiva empieza antes del contacto. NIOSH, el instituto estadounidense de seguridad y salud ocupacional, recomienda que los conductores de larga distancia procuren siete horas o más de sueño y planifiquen tiempo suficiente para el recorrido. Para la empresa, el mismo enfoque implica evitar cronogramas irreales. Antes de salir, revisá cuatro cosas: cuánto dormiste de verdad, no cuánto tiempo estuviste en la cama; qué horario crítico vas a atravesar; si alguna medicación o sustancia puede reducir la alerta; y dónde están las alternativas seguras de parada. Sumá agua y comidas razonables, pero sin convertir alimentos o suplementos en una cura. El sueño suficiente sigue siendo la protección central frente a la somnolencia."""
    },
    {
        "chapter": "Microlección 8",
        "title": "Cuando conviene consultar",
        "kind": "health",
        "bullets": ["Somnolencia persistente", "Ronquidos intensos", "Pausas respiratorias observadas", "Evaluación profesional"],
        "narration": """Si la somnolencia aparece con frecuencia pese a reservar tiempo para dormir, no la normalices. Ronquidos intensos, pausas respiratorias observadas, despertares con sensación de ahogo, cefalea matinal o cansancio persistente merecen evaluación profesional. Pueden tener múltiples causas; este curso no diagnostica apnea del sueño ni indica tratamientos. Registrá horarios, síntomas y contexto, y consultá a un profesional de salud. También revisá con el prescriptor o farmacéutico cualquier medicamento que advierta somnolencia. No suspendas ni cambies dosis por tu cuenta. Para una empresa, facilitar la consulta y evitar castigar el reporte temprano mejora seguridad. Ocultar el problema para cumplir un horario puede convertir una condición tratable en un riesgo sostenido para el conductor y para terceros."""
    },
    {
        "chapter": "Ejercicio 2",
        "title": "Planificá antes del horario crítico",
        "kind": "exercise",
        "bullets": ["Salida 22:30", "Tramo monótono 02:00–04:00", "Poco sueño la noche anterior", "¿Qué corregís antes?"],
        "pause": 6,
        "narration": """Segundo ejercicio. El viaje comienza a las diez y media de la noche. El tramo más monótono cae entre las dos y las cuatro de la mañana. El conductor durmió poco la noche anterior, pero el horario comercial parece ajustado. ¿Cuál es la mejor acción antes de arrancar? Opción A: cargar bebidas energizantes. Opción B: mantener el plan y decidir en ruta. Opción C: comunicar el riesgo, revisar el horario y asegurar descanso suficiente o un relevo. Tenés seis segundos. La respuesta es la C. El riesgo ya es visible antes del viaje: poco sueño, horario nocturno y monotonía. La planificación debe corregirlo antes de exponer al conductor. La cafeína no compensa una deuda importante de sueño y esperar a que aparezcan señales reduce las alternativas."""
    },
    {
        "chapter": "Ficha práctica",
        "title": "Chequeo de alerta en viaje",
        "kind": "checklist",
        "bullets": ["ANTES: sueño, horario, medicación", "DURANTE: señales y calidad de conducción", "DECISIÓN: primer lugar seguro", "REGRESO: reevaluar, comunicar, registrar"],
        "narration": """La ficha práctica queda en cuatro bloques. Antes: anotá horas reales de sueño, franja del recorrido, medicaciones revisadas y dos lugares alternativos de parada. Durante: observá bostezos, parpadeo, trayectoria, carteles omitidos y memoria del tramo. Decisión: si aparecen señales combinadas, identificá el primer lugar seguro, comunicá la demora y detenete sin maniobras bruscas. Regreso: reevaluá después de la pausa. Si la alerta no es estable, no retomes. Registrá qué ocurrió para mejorar el próximo plan. Esta ficha no reemplaza el procedimiento de la empresa ni la normativa aplicable. Su valor está en hacer visible una decisión que suele quedar librada al momento de mayor cansancio. Completala antes del viaje y dejala accesible, sin manipularla mientras conducís."""
    },
    {
        "chapter": "Cierre y evaluación",
        "title": "La decisión profesional es conservar margen",
        "kind": "summary",
        "bullets": ["Reconocer temprano", "Detenerse de forma segura", "No confundir estímulo con descanso", "Planificar y consultar"],
        "narration": """Cierre. Cinco preguntas para comprobar el criterio. Uno: ¿la fatiga empieza cuando te dormís? No; puede degradar atención y decisión mucho antes. Dos: ¿ventana abierta y música fuerte recuperan alerta? No. Tres: ¿café y siesta corta reemplazan sueño suficiente? No; son una medida temporal en un lugar seguro. Cuatro: ¿qué señales justifican actuar? Correcciones tardías, deriva, salidas omitidas, párpados pesados o lagunas de memoria, especialmente combinadas. Cinco: ¿qué hacés si la somnolencia persiste o se repite? No seguís improvisando: reorganizás el viaje y consultás a un profesional. La experiencia no se demuestra aguantando. Se demuestra conservando margen, comunicando a tiempo y eligiendo una parada antes de que el cuerpo la imponga."""
    },
]

SOURCES = [
    ("Agencia Nacional de Seguridad Vial — Fatiga y estrés en la conducción", "https://www.argentina.gob.ar/seguridadvial/observatoriovialnacional/fatiga-y-estres-en-la-conduccion-de-vehiculos", "consultada el 23/09/2026"),
    ("NHTSA — Drowsy Driving", "https://www.nhtsa.gov/risky-driving/drowsy-driving", "consultada el 23/09/2026"),
    ("CDC/NIOSH — Long-Haul Truck Drivers", "https://www.cdc.gov/niosh/motor-vehicle/long-haul-truck-drivers/index.html", "actualizada 29/07/2024; consultada el 23/09/2026"),
]

def run(cmd):
    print("+", " ".join(map(str, cmd)), flush=True)
    subprocess.run([str(x) for x in cmd], check=True)

def ffprobe_duration(path):
    result = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path)
    ], check=True, capture_output=True, text=True)
    return float(result.stdout.strip())

def font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)

def wrapped(draw, text, xy, max_width, fnt, fill, spacing=10):
    words = text.split()
    lines, current = [], ""
    for word in words:
        trial = (current + " " + word).strip()
        if draw.textbbox((0, 0), trial, font=fnt)[2] <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    draw.multiline_text(xy, "\n".join(lines), font=fnt, fill=fill, spacing=spacing)
    return lines

def truck(draw, x, y, scale=1.0):
    draw.rounded_rectangle((x, y, x+255*scale, y+62*scale), radius=10*scale, fill="#16313E", outline=CYAN, width=max(2,int(3*scale)))
    draw.polygon([(x+255*scale,y+62*scale),(x+255*scale,y+15*scale),(x+320*scale,y+15*scale),(x+354*scale,y+62*scale)], fill=RED)
    draw.rectangle((x+275*scale,y+25*scale,x+318*scale,y+48*scale), fill="#BEEAF3")
    for cx in (x+55*scale,x+265*scale,x+328*scale):
        draw.ellipse((cx-14*scale,y+50*scale,cx+14*scale,y+78*scale), fill="#02070A", outline=WHITE, width=max(2,int(2*scale)))

def base_image(scene, idx):
    im = Image.new("RGB", (W, H), DARK)
    d = ImageDraw.Draw(im)
    for y in range(H):
        shade = int(7 + 12 * y / H)
        d.line((0,y,W,y), fill=(shade, 17+shade//2, 24+shade//2))
    d.rectangle((0,0,W,7), fill=CYAN)
    d.text((62,38), "STYLO CAMIÓN ACADEMY", font=font(23, True), fill=CYAN)
    d.text((W-250,40), f"{idx+1:02d} / {len(SCENES):02d}", font=font(19, True), fill=MUTED)
    d.text((62,93), scene["chapter"].upper(), font=font(24, True), fill=RED if "Ejercicio" in scene["chapter"] else AMBER)
    wrapped(d, scene["title"], (62,130), 760, font(48, True), WHITE, 8)
    d.rounded_rectangle((62,285,760,610), radius=20, fill=PANEL, outline="#21414F", width=2)
    y = 320
    for b in scene["bullets"]:
        d.ellipse((92,y+8,108,y+24), fill=CYAN)
        lines = wrapped(d, b, (126,y), 590, font(30, True), WHITE, 8)
        y += max(52, len(lines)*42+15)
    d.text((62,664), "Contenido educativo · Si la alerta baja, detenete en un lugar seguro", font=font(18), fill=MUTED)
    draw_visual(d, scene["kind"])
    return im

def draw_visual(d, kind):
    x0, y0, x1, y1 = 820, 110, 1215, 610
    d.rounded_rectangle((x0,y0,x1,y1), radius=26, fill="#0A1921", outline="#1A3B49", width=2)
    if kind == "road":
        d.polygon([(1000,575),(870,575),(965,220),(1070,220),(1160,575)], fill="#1E3039")
        for y in range(260,560,70):
            d.rectangle((1008,y,1024,y+35), fill=WHITE)
        truck(d, 855, 145, .8)
    elif kind in ("attention","signals"):
        d.ellipse((900,170,1140,410), outline=CYAN, width=10)
        d.ellipse((950,250,1090,320), fill=WHITE)
        d.ellipse((1005,262,1037,308), fill=DARK)
        if kind == "signals":
            d.line((900,470,1140,470), fill=AMBER, width=8)
            for xx in (920,1000,1080):
                d.polygon([(xx,445),(xx+25,495),(xx-25,495)], fill=AMBER)
    elif kind == "clock":
        d.ellipse((900,180,1135,415), outline=WHITE, width=8)
        d.line((1017,297,1017,220), fill=CYAN, width=10)
        d.line((1017,297,1080,330), fill=CYAN, width=10)
        d.arc((855,135,1180,460), 200, 340, fill=AMBER, width=18)
        d.text((930,500), "00–06  ·  tarde", font=font(24, True), fill=WHITE)
    elif kind == "compare":
        d.text((865,160), "SENSACIÓN", font=font(22, True), fill=AMBER)
        d.text((1060,160), "RECUPERACIÓN", font=font(22, True), fill=GREEN)
        for yy in (240,340,440):
            d.line((850,yy,1178,yy), fill="#254652", width=3)
            d.ellipse((900,yy-20,940,yy+20), fill=AMBER)
            d.line((1030,yy,1135,yy), fill=RED, width=8)
    elif kind == "exercise":
        d.text((895,180), "A", font=font(54, True), fill=MUTED)
        d.text((1000,180), "B", font=font(54, True), fill=GREEN)
        d.text((1105,180), "C", font=font(54, True), fill=MUTED)
        d.arc((900,270,1140,510), -90, 225, fill=CYAN, width=18)
        d.text((960,345), "6 s", font=font(52, True), fill=WHITE)
    elif kind == "stop":
        d.ellipse((915,175,1135,395), fill=RED, outline=WHITE, width=8)
        d.text((957,245), "PARE", font=font(46, True), fill=WHITE)
        truck(d, 850, 470, .85)
    elif kind == "nap":
        d.text((890,170), "20", font=font(110, True), fill=CYAN)
        d.text((1050,235), "min", font=font(34, True), fill=WHITE)
        d.arc((880,145,1155,420), 200, 340, fill=GREEN, width=16)
        d.text((895,470), "MEDIDA TEMPORAL", font=font(24, True), fill=AMBER)
    elif kind == "plan":
        for i, label in enumerate(("SUEÑO","HORARIO","PARADAS","COMUNICAR")):
            yy=155+i*100
            d.rounded_rectangle((855,yy,1175,yy+65), 14, fill="#12303B", outline=CYAN, width=2)
            d.text((885,yy+18), label, font=font(25, True), fill=WHITE)
            d.text((1120,yy+16), "✓", font=font(30, True), fill=GREEN)
    elif kind == "health":
        d.line((860,335,925,335), fill=CYAN, width=8)
        pts=[(925,335),(950,270),(985,410),(1020,305),(1050,335),(1170,335)]
        d.line(pts, fill=RED, width=8)
        d.text((900,470), "CONSULTA PROFESIONAL", font=font(22, True), fill=WHITE)
    elif kind in ("checklist","summary"):
        for i in range(4):
            yy=155+i*100
            d.rounded_rectangle((865,yy,920,yy+55), 8, fill=GREEN)
            d.line((880,yy+30,894,yy+42), fill=DARK, width=6)
            d.line((894,yy+42,910,yy+15), fill=DARK, width=6)
            d.line((940,yy+28,1170,yy+28), fill="#315565", width=8)
    else:
        truck(d, 855, 300, .85)

def srt_time(seconds):
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def subtitle_chunks(text, words_per=10):
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks = []
    for sentence in sentences:
        words = sentence.split()
        while words:
            take = words[:words_per]
            words = words[words_per:]
            chunks.append(" ".join(take))
    return chunks

async def synthesize(text, out):
    await edge_tts.Communicate(text=text, voice=VOICE, rate="-4%", volume="+0%").save(str(out))

def write_documents(total_duration):
    script = ["# Fatiga en ruta: reconocer señales y tomar decisiones seguras", "", f"Duración final: {total_duration/60:.2f} min", f"Voz: {VOICE}", ""]
    for i, s in enumerate(SCENES, 1):
        script += [f"## {i}. {s['chapter']} — {s['title']}", "", s["narration"], ""]
    script += ["## Fuentes primarias", ""]
    for title, url, note in SOURCES:
        script.append(f"- [{title}]({url}) — {note}.")
    (OUT/"Guion-Fatiga-en-Ruta-v01.md").write_text("\n".join(script), encoding="utf-8")

    ficha = """# Ficha práctica — Chequeo de alerta en viaje

## Antes de arrancar
- Horas reales de sueño:
- Franja horaria de mayor riesgo prevista:
- Medicaciones revisadas:
- Alternativa segura de parada 1:
- Alternativa segura de parada 2:

## Durante
Marcá señales observadas: bostezos/parpadeo frecuente; párpados pesados; deriva o correcciones tardías; carteles/salidas omitidos; lagunas de memoria.

## Decisión
Si aparecen señales combinadas: comunicá la demora, elegí el primer lugar habilitado y seguro, señalizá con anticipación y detenete sin maniobras bruscas.

## Antes de retomar
¿La alerta es estable? ¿Desaparecieron las señales? ¿El plan sigue siendo realista? Si no, no retomes: reorganizá, pedí relevo o asistencia.

Material educativo. No reemplaza normativa, procedimientos de empresa ni evaluación médica.
"""
    (OUT/"Ficha-Chequeo-de-Alerta-v01.md").write_text(ficha, encoding="utf-8")

    evaluation = {
        "course_id": "fatiga-alerta-ruta",
        "version": "1.0",
        "passing_score_percent": 80,
        "questions": [
            {"question":"¿Cuándo empieza a afectar la fatiga?","options":["Solo al dormirse","Puede afectar atención y decisión antes del sueño","Solo después de medianoche"],"correct":1,"explanation":"La degradación puede aparecer antes del cabeceo o microsueño."},
            {"question":"¿Qué acción recupera de forma fiable el sueño perdido?","options":["Ventana abierta","Música fuerte","Dormir lo suficiente"],"correct":2,"explanation":"Los estímulos cambian la sensación; no sustituyen sueño suficiente."},
            {"question":"Ante señales combinadas, ¿qué corresponde?","options":["Acelerar","Detenerse en el primer lugar habilitado y seguro","Esperar a cabecear"],"correct":1,"explanation":"Actuar temprano conserva margen y alternativas."},
            {"question":"¿Café más siesta breve es una solución definitiva?","options":["Sí","No, es una medida temporal","Solo de día"],"correct":1,"explanation":"Puede ayudar a corto plazo, pero no reemplaza descanso adecuado."},
            {"question":"¿Qué hacer ante somnolencia persistente?","options":["Ocultarla","Cambiar medicación por cuenta propia","Consultar a un profesional y reorganizar la conducción"],"correct":2,"explanation":"El curso no diagnostica; corresponde evaluación profesional."}
        ]
    }
    (OUT/"Evaluacion-Fatiga-en-Ruta-v01.json").write_text(json.dumps(evaluation, ensure_ascii=False, indent=2), encoding="utf-8")
    sources = ["# Fuentes — Fatiga en ruta", "", "Selección cualitativa por impacto en seguridad; no representa un ranking de búsquedas.", ""]
    sources += [f"- {a}: {b} ({c})" for a,b,c in SOURCES]
    (OUT/"Fuentes-Fatiga-en-Ruta-v01.md").write_text("\n".join(sources), encoding="utf-8")
    structure = {
        "course_id":"fatiga-alerta-ruta",
        "title":"Fatiga en ruta: reconocer señales y tomar decisiones seguras",
        "version":"1.0",
        "destination":"Stylo Camión Academy",
        "sequence":["video","microlecciones","ficha_practica","evaluacion","progreso","certificado"],
        "micro_lessons":[s["title"] for s in SCENES if s["chapter"].startswith("Microlección")],
        "certificate_rule":"Elegible al completar video, ficha y evaluación con 80% o más; requiere infraestructura Academy."
    }
    (OUT/"Academy-Estructura-Fatiga-v01.json").write_text(json.dumps(structure, ensure_ascii=False, indent=2), encoding="utf-8")

async def main():
    shutil.rmtree(BUILD, ignore_errors=True)
    shutil.rmtree(OUT, ignore_errors=True)
    BUILD.mkdir(parents=True)
    OUT.mkdir(parents=True)
    concat_lines, srt_entries = [], []
    cursor = 0.0
    for idx, scene in enumerate(SCENES):
        stem = f"{idx+1:02d}"
        mp3 = BUILD/f"{stem}.mp3"
        wav = BUILD/f"{stem}.wav"
        png = BUILD/f"{stem}.png"
        video = BUILD/f"{stem}.mp4"
        await synthesize(scene["narration"], mp3)
        pause = float(scene.get("pause", 0))
        run(["ffmpeg","-y","-i",mp3,"-af",f"apad=pad_dur={pause}","-ar","48000","-ac","1",wav])
        speech_dur = ffprobe_duration(mp3)
        duration = ffprobe_duration(wav)
        base_image(scene, idx).save(png, quality=95)
        run([
            "ffmpeg","-y","-loop","1","-framerate",str(FPS),"-i",png,"-i",wav,
            "-vf",f"scale=1344:756,zoompan=z='min(zoom+0.00018,1.045)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS}",
            "-t",f"{duration:.3f}","-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p",
            "-c:a","aac","-b:a","128k","-ar","48000","-ac","1","-shortest",video
        ])
        concat_lines.append(f"file '{video.resolve().as_posix()}'")
        chunks = subtitle_chunks(scene["narration"])
        weights = [max(1,len(c.split())) for c in chunks]
        pos = cursor
        for j,(chunk,weight) in enumerate(zip(chunks,weights)):
            dur = speech_dur * weight / sum(weights)
            srt_entries.append((pos,pos+dur,chunk))
            pos += dur
        if pause:
            srt_entries.append((cursor+speech_dur, cursor+duration, "[Pausa para pensar]"))
        cursor += duration
    (BUILD/"concat.txt").write_text("\n".join(concat_lines), encoding="utf-8")
    joined = BUILD/"joined.mp4"
    run(["ffmpeg","-y","-f","concat","-safe","0","-i",BUILD/"concat.txt","-c","copy",joined])
    srt = OUT/"Stylo-Camion-Academy-Fatiga-en-Ruta-v01.srt"
    lines=[]
    for i,(start,end,text) in enumerate(srt_entries,1):
        lines += [str(i),f"{srt_time(start)} --> {srt_time(end)}",text,""]
    srt.write_text("\n".join(lines), encoding="utf-8")
    final = OUT/"Stylo-Camion-Academy-Fatiga-en-Ruta-Con-Audio-v01.mp4"
    style = "FontName=DejaVu Sans,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00101820,BorderStyle=3,Outline=2,Shadow=0,MarginV=38,Alignment=2"
    run([
        "ffmpeg","-y","-i",joined,"-vf",f"subtitles={srt.as_posix()}:force_style='{style}'",
        "-af","loudnorm=I=-16:TP=-1.5:LRA=11",
        "-c:v","libx264","-preset","medium","-crf","19","-pix_fmt","yuv420p",
        "-c:a","aac","-b:a","128k","-ar","48000","-ac","1",
        "-movflags","+faststart",final
    ])
    duration = ffprobe_duration(final)
    write_documents(duration)
    sha = hashlib.sha256(final.read_bytes()).hexdigest()
    (OUT/"SHA256SUMS.txt").write_text(f"{sha}  {final.name}\n", encoding="utf-8")
    qa = {
        "file": final.name,
        "duration_seconds": round(duration,3),
        "resolution": f"{W}x{H}",
        "fps": FPS,
        "video_codec":"h264",
        "audio_codec":"aac",
        "audio_channels":1,
        "subtitle_mode":"burned-in plus SRT",
        "voice":VOICE,
        "sha256":sha,
        "checks":["ffmpeg full decode in workflow","ffprobe streams","faststart","subtitle timing generated from scene audio"],
        "limitations":["Human listening review pending","Physical iPhone test pending","Public Academy MP4 hosting/player not configured"]
    }
    (OUT/"QA-Fatiga-en-Ruta-v01.json").write_text(json.dumps(qa, ensure_ascii=False, indent=2), encoding="utf-8")
    run(["ffmpeg","-v","error","-i",final,"-f","null","-"])
    print(json.dumps(qa, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
