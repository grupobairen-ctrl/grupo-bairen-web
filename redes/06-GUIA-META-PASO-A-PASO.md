# Crear la campaña de Propietarios en Meta — paso a paso (junio 2026)

> Funnel: Video propietarios → Formulario filtro → Sheet → llamás a los 🟢.
> Estructura ya decidida: objetivo **Leads**, **ABO** (manual), **amplio + geo afluente**, **sin intereses**, form en **intención más alta**, **3 copies**.

---

## 0 · Antes de empezar (checklist)

- [ ] Video de propietarios listo (vertical 9:16 o cuadrado).
- [ ] URL de política de privacidad publicada: `bairengroup.com/privacidad` (Meta la exige para el form).
- [ ] Página de Facebook + cuenta de Instagram de Bairen conectadas.
- [ ] Método de pago cargado en la cuenta publicitaria.
- [ ] Los textos del doc `04` (copies) y `05` (formulario) a mano para copiar y pegar.

Entrá a **Administrador de anuncios** (business.facebook.com → Ads Manager) → botón **+ Crear**.

---

## ⚠️ Lo más importante (no te lo saltees)

1. **Categoría especial de anuncios = Ninguna.** Si marcás "Vivienda/Housing", Meta te bloquea segmentar por edad y por barrio chico (las restricciones de esa categoría aplican a EE.UU./Canadá, no a Argentina). Marcarla **rompe** tu conjunto Geo Afluente. Dejala en **Ninguna**.
2. **Pasá la campaña a manual / Advantage+ desactivado.** Sino, el algoritmo ensancha el público y baja la calidad — fatal para propietarios.

---

## NIVEL 1 · CAMPAÑA

1. **+ Crear** → Objetivo: **Clientes potenciales** (Leads).
2. Meta ofrece **"Campaña Advantage+ de clientes potenciales"** por default → elegí **configuración manual** (o desactivá el Advantage+ de público). Para esta fase de test querés control.
3. Nombre: `PROPIETARIOS | Leads | Form | jun-2026`.
4. **Categoría especial de anuncios:** Ninguna (ver advertencia arriba).
5. **Presupuesto de campaña Advantage (CBO): DESACTIVADO.** Así el presupuesto vive en cada conjunto = **ABO** = lectura limpia por audiencia. (CBO lo vas a usar después, solo para escalar al ganador.)
6. Siguiente.

---

## NIVEL 2 · CONJUNTO DE ANUNCIOS

Armás **AS1 · Amplio** primero; AS2 sale de duplicar.

1. Nombre: `AS1 · Amplio`.
2. **Conversión → Lugar de conversión:** **Formularios instantáneos** (Instant forms). (No Mensajes, no Sitio web, no Llamadas.)
3. **Optimización para la entrega:** **Clientes potenciales** (Leads). *(Si más adelante conectás el Sheet para devolverle a Meta qué lead firmó, podés pasar a "Clientes potenciales por conversión" y optimiza por CALIDAD — upgrade para después.)*
4. **Presupuesto:** Diario. Cargá tu monto.
5. **Público:**
   - **Ubicación:** Argentina → **CABA + GBA Norte**.
   - **Edad:** 30–65.
   - **Sexo:** Todos.
   - **Segmentación detallada:** VACÍA (sin intereses — es lo que te reventó el CPM la otra vez).
   - **Público Advantage:** si aparece sugerido, dejá que mande TU selección (modo "original"/manual), no que lo ensanche.
6. **Ubicaciones:** dejá **Ubicaciones Advantage (automáticas)**. Esto sí conviene automático.
7. Siguiente.

**AS2 · Geo afluente (después de terminar AS1):** duplicá AS1 → renombrá `AS2 · Geo afluente` → en **Ubicación** borrá "CABA" y agregá solo: Recoleta, Palermo, Las Cañitas, Belgrano, Núñez, Puerto Madero, Palermo Chico, Colegiales, Vicente López, Olivos, San Isidro, Martínez, La Lucila (por barrio o pin + radio chico). Edad **35–65**.

---

## NIVEL 3 · ANUNCIO

1. Nombre: `Video | Copy A`.
2. **Identidad:** seleccioná Página de Facebook + Instagram de Bairen.
3. **Formato:** Video → subí el video de propietarios.
4. **Texto principal:** pegá **Copy A** (del doc 04). **Título:** *Su propiedad, frente a inquilinos verificados.* **Descripción:** *Curaduría residencial · Buenos Aires.*
5. **Llamada a la acción:** **Más información**.
6. **Formulario instantáneo:** **+ Crear formulario** (ver abajo).

### Construir el formulario (el filtro)

1. **Tipo:** **Intención más alta** (agrega paso de confirmación = menos basura).
2. **Introducción:** activá la pantalla → cargá título + texto + imagen de la **Pantalla 1** del doc `05`.
3. **Preguntas → Preguntas personalizadas:** agregá Q1 a Q7 como **Opción múltiple**, copiando pregunta y opciones exactas del doc `05`.
   - Q1 (rol): usá **lógica condicional** para que "Busco un departamento" y "Estoy mirando" terminen en la **Pantalla de cierre B**. (Si tu versión no deja ramificar por pregunta, no pasa nada: esos leads los marcás 🔴 en el Sheet.)
   - Q2: condicional "Otro barrio" → pregunta corta "¿Cuál?".
4. **Información de contacto:** dejá Nombre, Teléfono/WhatsApp, Email (Meta los prellena). Opcional: horario de contacto.
5. **Política de privacidad:** pegá `bairengroup.com/privacidad`.
6. **Pantalla de finalización:** cargá la **Pantalla de cierre A** del doc `05` → botón "Ver sitio web" → `bairengroup.com`.
7. **Guardar.** ⚠️ Una vez que el form recibe un lead **no se puede editar** — para cambios se duplica.

### Los 3 copies

Publicá Copy A. Después, en el mismo AS1, **duplicá el anuncio** 2 veces y cambiá solo Texto principal + Título por **Copy B** y **Copy C** (mismo video, mismo formulario). Quedan 3 anuncios; Meta reparte al ganador.

---

## PUBLICAR

1. Revisá los 3 niveles. **Publicar.** Pasa a revisión de Meta (minutos a pocas horas).
2. Si vas a correr AS2 en paralelo, duplicalo ahora con sus barrios.

---

## CONECTAR LOS LEADS AL SHEET

- En **Centro de clientes potenciales** (Página → Herramientas para clientes potenciales) verificá que el formulario nuevo esté asignado a tu integración de Google Sheets / CRM ya vinculada. Si no, conectala ahí (nativa o vía Zapier), o descargá los leads en CSV.

---

## PRIMERAS 48 H (qué mirar)

- **CPM por conjunto.** Si AS2 sale 2-3× el de AS1 → muy angosto: ensanchá.
- **No toques nada 3-4 días** (no reinicies el aprendizaje).
- Los leads caen al Sheet → aplicá la **rúbrica 🟢🟡🔴** del doc `05`. Llamás solo a los verdes.
- A los 7-10 días: matá copy y conjunto perdedores. Al ganador, escalalo con CBO/Advantage+.
