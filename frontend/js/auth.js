document.addEventListener('DOMContentLoaded', () => {
  seedFrontendData();

  const existingUser = getCurrentUser();
  if (existingUser) {
    redirectByRole(existingUser.rol);
    return;
  }

  const form = document.getElementById('loginForm');
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');

  togglePassword.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePassword.textContent = isPassword ? 'Ocultar' : 'Ver';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideMessage('loginMessage');

    const cedula = document.getElementById('cedula').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!cedula || !password) {
      showMessage('loginMessage', 'Ingrese cédula y contraseña.', 'error');
      return;
    }

    try {
      const result = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ cedula, password })
      });

      const user = {
        cedula: result.usuario.cedula,
        nombre: result.usuario.nombre_completo || result.usuario.nombre,
        rol: result.usuario.rol,
        token: result.token
      };

      setCurrentUser(user);
      redirectByRole(user.rol);
    } catch (backendError) {
      if (!APP_CONFIG.demoMode) {
        showMessage('loginMessage', backendError.message || 'No se pudo conectar con el servidor.', 'error');
        return;
      }

      const users = getStored(APP_CONFIG.storageKeys.users, DEMO_USERS);
      const found = users.find((user) => user.cedula === cedula && user.password === password);

      if (!found) {
        showMessage('loginMessage', 'Credenciales incorrectas. Revise la cédula y contraseña asignada.', 'error');
        return;
      }

      if (found.estado !== 'ACTIVO') {
        showMessage('loginMessage', 'El usuario no está activo. Contacte al administrador del sistema.', 'error');
        return;
      }

      setCurrentUser({
        cedula: found.cedula,
        nombre: found.nombre,
        rol: found.rol,
        token: 'demo-token'
      });

      redirectByRole(found.rol);
    }
  });
});

function redirectByRole(role) {
  if (['ADMINISTRADOR', 'TALENTO_HUMANO'].includes(role)) {
    window.location.href = 'admin.html';
    return;
  }

  window.location.href = 'marcaciones.html';
}
