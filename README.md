# MY3D.PR — Platform E-Commerce & Custom Studio 3D

Plataforma e-commerce completa y lista para producción desarrollada para **MY3D.PR** (negocio de productos e impresiones 3D personalizadas en Puerto Rico y Estados Unidos).

## 🚀 Características Principales

- **Storefront Moderno & Mobile-First**: UI/UX futurista e inspirada en impresión 3D (filamentos, capas, polígonos) basada en la paleta de colores extraída del logo oficial `IMG_7897.jpg` (Cyan Eléctrico `#3BB4D8`, Naranja Filamento `#E87A38`, Verde Faceta `#4DAA78`, Grafito `#0F1215`).
- **Experiencia Build-a-Box**: Creador interactivo por pasos para cajas combos de 5 y 10 productos con descuento dinámico del 15% al 25% y validación de cajas incompletas.
- **MY3D Custom Studio**: Formulario para carga de modelos 3D (`.STL`, `.3MF`, `.OBJ`, `.ZIP`) con validación de extensiones y flujo de cotizaciones.
- **Bilingüe Nativo (ES / EN)**: Soporte completo en Español como predeterminado e Inglés sin duplicación de páginas.
- **Abstracción de Pagos**: Capa de pago preparada para **Stripe** (Tarjetas, Apple Pay, Google Pay), **PayPal** y **ATH Móvil** (Instrucciones oficiales + integración de negocios PR).
- **Envíos Puerto Rico & EE.UU.**: Reglas de envío calculadas por peso/región con umbral administrable de Envío Gratis ($50+ USD).
- **Panel Administrativo (RBAC)**: Gestión de catálogo, KPIs en tiempo real, cotizaciones custom e **Importación Masiva vía CSV / XLSX** con previsualización y reporte de errores.

---

## 🛠️ Tecnologías

- **Framework**: Next.js 14+ (App Router), React 18, TypeScript
- **Estilos & UI**: Tailwind CSS, Framer Motion, Lucide Icons
- **Base de Datos & Auth**: PostgreSQL / Supabase, RLS (Row Level Security)
- **Importación/Exportación**: PapaParse (CSV), XLSX
- **Despliegue**: Vercel ready con variables de entorno parametrizadas

---

## 💻 Instalación Local

```bash
# 1. Clonar el repositorio e instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local

# 3. Iniciar servidor de desarrollo
npm run dev
```

El proyecto estará corriendo en `http://localhost:3000`.

---

## 🗄️ Base de Datos & Migraciones Supabase

El archivo de migración maestro que contiene las 34 tablas, índices, llaves foráneas y políticas RLS se encuentra en:
`supabase/migrations/20260806000000_my3d_schema.sql`

Para ejecutar las migraciones en tu proyecto de Supabase:
```bash
npx supabase db push
```

---

## 📦 Importación Masiva CSV / XLSX

Para cargar más de 100 productos de forma masiva:
1. Accede al panel administrativo `/admin`.
2. Ve a la pestaña **Importación Masiva**.
3. Sube tu archivo con las columnas: `sku`, `name_es`, `name_en`, `price`, `material`, `status`.
4. Revisa la validación en tiempo real y confirma la inserción.
