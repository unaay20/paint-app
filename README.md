# 🎨 Aplicación Web de Dibujo Vectorial (Paint)

## 🧩 Descripción
Esta aplicación web permite crear y editar gráficos vectoriales directamente desde el navegador. El usuario puede dibujar **líneas, rectángulos, cuadrados, elipses, círculos y polígonos** (como estrellas), así como **cambiar colores, cargar imágenes de fondo, guardar y recuperar sus dibujos**. Está desarrollada con **HTML, CSS y JavaScript puro** (sin frameworks CSS).

## ⚙️ Funcionalidades principales
- Dibujo de figuras geométricas vectoriales:
  - Línea  
  - Rectángulo  
  - Cuadrado  
  - Elipse  
  - Círculo  
  - Polígonos y figuras personalizadas (ej. estrellas)
- Selección de colores de borde y relleno  
- Carga de imágenes desde el equipo para establecer como fondo  
- Guardado y recuperación de dibujos

## 🏗️ Tecnologías utilizadas
**Frontend:**
- HTML5  
- CSS3  
- JavaScript (Canvas API)

**Backend:**
- Node.js  
- Express  
- Base de datos con SQLite para persistencia de dibujos

## 📂 Estructura del proyecto
```plaintext
📁 paint-app/
│
├── 📁 public/            # Archivos estáticos (HTML, CSS, JS)
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── server.js             # Servidor Express
│
├── package.json
├── package-lock.json
└── README.md
```

## 🚀 Instalación y ejecución
Asegúrate de tener **Node.js 18+** y **npm 9+** instalados.

1. Clona o descarga este repositorio:
   ```bash
   git clone https://github.com/unaay20/paint-app.git
   cd paint-app
2. Instala las dependencias:
    ```bash
    npm install
3. Inicia la aplicación:
    ```bash
    npm start
4. Abre en tu navegador:
    ```bash
    http://localhost:3000
## 👨‍💻 Autor
Desarrollado por U Náay
Estudiante de Ingeniería de Software