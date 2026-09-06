// tailwind-theme.js
// Configuração ÚNICA do Tailwind para todo o sistema: cores customizadas,
// fonte e sombras usadas em todos os módulos.
//
// IMPORTANTE — ordem de carregamento na página:
//   1º <script src="https://cdn.tailwindcss.com"></script>   (cria o objeto `tailwind`)
//   2º <script src="tailwind-theme.js"></script>              (configura esse objeto)
// Se a ordem for invertida, `tailwind` ainda não existe quando este
// arquivo roda e a configuração inteira é perdida silenciosamente
// (cores, fonte e sombra customizadas somem da página).
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                darkbg: '#0d1117',
                cardbg: '#161b22',
                cardborder: '#30363d',
                primary: '#505154' // cor principal do sistema, centralizada aqui
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            },
            fontFamily: {
                sans: ['"DM Sans"', 'sans-serif'],
            }
        }
    }
}
