// Proteção didática de navegação. NÃO é autenticação real de servidor.
if (sessionStorage.getItem('laboratorioLogado') !== 'sim') {
  window.location.replace('index.html');
} else {
  iniciarAplicacao();
}

function iniciarAplicacao() {
  const CHAVE_DADOS = 'sensoresManausAula';
  const centroManaus = { lat: -3.10, lng: -60.04 };
  let mapa;
  let marcadores = [];
  let sensores = carregarSensores();
  const mensagem = document.querySelector('#mensagem');

  document.querySelector('#sair').addEventListener('click', () => {
    sessionStorage.removeItem('laboratorioLogado');
    window.location.href = 'index.html';
  });

  function carregarSensores() {
    try {
      const dados = JSON.parse(localStorage.getItem(CHAVE_DADOS) || '[]');
      return Array.isArray(dados) ? dados.filter(s =>
        s && typeof s.nome === 'string' && Number.isFinite(s.lat) &&
        Number.isFinite(s.lng) && ['conectado', 'offline'].includes(s.status)
      ) : [];
    } catch { return []; }
  }
  function salvarSensores() {
    localStorage.setItem(CHAVE_DADOS, JSON.stringify(sensores));
  }
  function informar(texto) { mensagem.textContent = texto; }
  function formatar(n) { return Number(n).toFixed(5); }

  // Evita depender de um arquivo HTML com a chave escrita na URL.
  function carregarGoogleMaps() {
    return new Promise((resolve, reject) => {
      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'SUA_CHAVE_API') {
        reject(new Error('Configure sua chave da API em config.js.'));
        return;
      }
      window.googleMapsPronto = resolve;
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' +
        encodeURIComponent(GOOGLE_MAPS_API_KEY) +
        '&loading=async&libraries=maps,marker&callback=googleMapsPronto';
      script.async = true;
      script.onerror = () => reject(new Error('Não foi possível carregar a API do Google Maps.'));
      document.head.appendChild(script);
    });
  }

  async function criarMapa() {
    try {
      await carregarGoogleMaps();
      const { Map } = await google.maps.importLibrary('maps');
      mapa = new Map(document.querySelector('#mapa'), {
        center: centroManaus, zoom: 11, mapId: 'DEMO_MAP_ID'
      });
      // Clique no mapa define as coordenadas do próximo cadastro.
      mapa.addListener('click', (evento) => {
        if (!evento.latLng) return;
        document.querySelector('#lat').value = formatar(evento.latLng.lat());
        document.querySelector('#lng').value = formatar(evento.latLng.lng());
        informar('Coordenadas selecionadas. Informe a tag e o status do sensor.');
      });
      desenharSensores();
    } catch (erro) {
      informar(erro.message + ' Confira também faturamento e restrições no Google Cloud.');
    }
  }

  async function desenharSensores() {
    if (!mapa) return;
    // Remove marcadores anteriores para evitar duplicações.
    marcadores.forEach(marcador => { marcador.map = null; });
    marcadores = [];
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker');
    sensores.forEach(sensor => {
      const conectado = sensor.status === 'conectado';
      const pin = new PinElement({
        background: conectado ? '#16a34a' : '#dc2626',
        borderColor: conectado ? '#166534' : '#991b1b',
        glyphColor: '#ffffff'
      });
      const marcador = new AdvancedMarkerElement({
        map: mapa,
        position: { lat: sensor.lat, lng: sensor.lng },
        title: sensor.nome + ' - ' + (conectado ? 'Conectado' : 'Offline'),
        content: pin.element
      });
      marcadores.push(marcador);
    });
  }

  function atualizarLista() {
    const lista = document.querySelector('#listaSensores');
    lista.replaceChildren();
    document.querySelector('#contador').textContent = '(' + sensores.length + ')';
    if (!sensores.length) {
      const item = document.createElement('li');
      item.textContent = 'Nenhum sensor cadastrado.';
      lista.appendChild(item);
      return;
    }
    sensores.forEach(sensor => {
      const item = document.createElement('li');
      const titulo = document.createElement('strong');
      titulo.textContent = sensor.nome;
      const detalhe = document.createElement('span');
      detalhe.textContent = ' • ' + sensor.status + ' • ' + formatar(sensor.lat) + ', ' + formatar(sensor.lng);
      const botao = document.createElement('button');
      botao.className = 'small-button';
      botao.textContent = sensor.status === 'conectado' ? 'Marcar offline' : 'Marcar conectado';
      botao.addEventListener('click', async () => {
        sensor.status = sensor.status === 'conectado' ? 'offline' : 'conectado';
        salvarSensores(); atualizarLista(); await desenharSensores();
        informar('Status atualizado: ' + sensor.nome + ' → ' + sensor.status);
      });
      const focar = document.createElement('button');
      focar.className = 'small-button secondary';
      focar.textContent = 'Localizar';
      focar.addEventListener('click', () => {
        if (!mapa) return;
        mapa.setCenter({ lat: sensor.lat, lng: sensor.lng }); mapa.setZoom(16);
      });
      item.append(titulo, detalhe, document.createElement('br'), botao, focar);
      lista.appendChild(item);
    });
  }

  document.querySelector('#sensorForm').addEventListener('submit', async evento => {
    evento.preventDefault();
    const nome = document.querySelector('#nome').value.trim();
    const lat = Number(document.querySelector('#lat').value);
    const lng = Number(document.querySelector('#lng').value);
    const status = document.querySelector('#status').value;
    if (!nome || !Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      informar('Confira nome, latitude (-90 a 90) e longitude (-180 a 180).'); return;
    }
    if (sensores.some(sensor => sensor.nome.toLowerCase() === nome.toLowerCase())) {
      informar('A tag já existe. Escolha outro nome.'); return;
    }
    sensores.push({ id: Date.now().toString(36), nome, lat, lng, status });
    salvarSensores(); atualizarLista(); await desenharSensores();
    if (mapa) { mapa.setCenter({ lat, lng }); mapa.setZoom(15); }
    evento.target.reset();
    informar('Sensor ' + nome + ' cadastrado com sucesso.');
  });

  document.querySelector('#mostrarTodos').addEventListener('click', () => {
    if (!mapa) return;
    if (!sensores.length) { mapa.setCenter(centroManaus); mapa.setZoom(11); return; }
    if (sensores.length === 1) {
      mapa.setCenter({ lat: sensores[0].lat, lng: sensores[0].lng });
      mapa.setZoom(15); return;
    }
    const limites = new google.maps.LatLngBounds();
    sensores.forEach(sensor => limites.extend({ lat: sensor.lat, lng: sensor.lng }));
    mapa.fitBounds(limites, 60);
  });

  document.querySelector('#limpar').addEventListener('click', async () => {
    if (!confirm('Excluir todos os sensores cadastrados neste navegador?')) return;
    sensores = []; salvarSensores(); atualizarLista(); await desenharSensores();
    informar('Todos os sensores foram excluídos.');
  });
  atualizarLista();
  criarMapa();
}
