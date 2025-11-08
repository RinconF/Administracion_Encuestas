(() => {
    const SESSION_KEY = 'encuestas_sesion_usuario';

    const DEMO_USERS = [
        {
            id: 'usuario-demo-1',
            nombre: 'María Rivera',
            correo: 'maria.rivera@empresa.com',
            password: '123456',
            encuestaAsignada: null
        },
        {
            id: 'usuario-demo-2',
            nombre: 'Carlos Herrera',
            correo: 'carlos.herrera@empresa.com',
            password: '123456',
            encuestaAsignada: null
        }
    ];

    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('loginForm');
        const errorMessage = document.getElementById('loginError');
        if (!form) return;

        form.addEventListener('submit', event => {
            event.preventDefault();
            const email = form.loginEmail.value.trim().toLowerCase();
            const password = form.loginPassword.value.trim();

            const user = DEMO_USERS.find(candidate => candidate.correo === email && candidate.password === password);
            if (!user) {
                showError('Credenciales incorrectas. Intenta nuevamente.', errorMessage);
                return;
            }

            sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                id: user.id,
                nombre: user.nombre,
                correo: user.correo,
                encuestaAsignada: user.encuestaAsignada
            }));

            showError('', errorMessage);
            window.location.href = 'index.html?view=user';
        });
    });

    function showError(message, element) {
        if (!element) return;
        element.textContent = message;
    }
})();
