// Apenas para aprender eventos, formulários e sessionStorage.
// AVISO: login no navegador NÃO substitui autenticação segura no servidor.
const loginForm = document.querySelector('#loginForm');
loginForm.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const usuario = document.querySelector('#usuario').value.trim();
  const senha = document.querySelector('#senha').value;
  if (usuario === 'aluno' && senha === '123456') {
    sessionStorage.setItem('laboratorioLogado', 'sim');
    window.location.href = 'mapa.html';
  } else {
    document.querySelector('#mensagemLogin').textContent = 'Usuário ou senha inválidos.';
  }
});