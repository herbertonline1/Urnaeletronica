import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-E0xStEwuGyBY3-rGCBl09r04uDJeyow",
  authDomain: "urna-65799.firebaseapp.com",
  projectId: "urna-65799",
  storageBucket: "urna-65799.firebasestorage.app",
  messagingSenderId: "306455847436",
  appId: "1:306455847436:web:1d671ab5c0f2352857c429"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userId = "";
let userIP = "";
let userRegiao = "Não identificada";
let jaVotou = false;

let num1 = document.getElementById('num1');
let num2 = document.getElementById('num2');
let somNumeros = document.getElementById('somNumeros');
let somConfirma = document.getElementById('somConfirma');
let nomeTitulo = document.getElementById('nomeTitle');
let nomeCandidato = document.getElementById('nomeCandidato');
let partido = document.getElementById('partidoCandidato');
let foto = document.getElementById('fotoPresidente');
let legenda = document.getElementById('legenda');

function tocar(audio) {
    try {
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
    } catch (e) { /* ignora falhas de áudio em alguns navegadores */ }
}

// IP e região são apenas informativos (aparecem no painel admin).
// NÃO são usados para bloquear o voto, então se falharem o voto continua funcionando.
async function buscarIPeRegiao() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        const data = await res.json();
        userIP = data.ip || "";
        if (data.city && data.region_code) {
            userRegiao = `${data.city} - ${data.region_code}`;
        } else if (data.country_name) {
            userRegiao = data.country_name;
        }
    } catch (e) {
        console.warn("Não foi possível obter IP/Região (não bloqueia o voto):", e);
    } finally {
        clearTimeout(timer);
    }
}

// Identificação do eleitor: login anônimo do Firebase.
// Cada navegador/dispositivo recebe um ID próprio e persistente, independente da rede.
// O documento votos/{uid} só pode ser criado uma vez (garantido pelas regras do Firestore).
const ipPromise = buscarIPeRegiao();

async function iniciar() {
    try {
        const cred = await signInAnonymously(auth);
        userId = cred.user.uid;

        const docSnap = await getDoc(doc(db, "votos", userId));
        if (docSnap.exists()) {
            jaVotou = true;
            bloquearVotacao();
        }
    } catch (e) {
        console.error("Erro ao identificar o eleitor:", e);
        nomeTitulo.innerText = 'ERRO';
        nomeCandidato.innerText = 'Não foi possível conectar. Recarregue a página.';
        document.querySelectorAll('.btn, .btnAcao').forEach(btn => btn.disabled = true);
    }
}

function bloquearVotacao() {
    nomeTitulo.innerText = 'VOTO REGISTRADO';
    nomeCandidato.innerText = 'Seu dispositivo já votou.';
    partido.innerText = '';
    num1.innerText = '';
    num2.innerText = '';
    document.querySelectorAll('.btn, .btnAcao').forEach(btn => btn.disabled = true);
    // Deixa os botões BRANCO, CORRIGE e CONFIRMA apagados
    document.querySelectorAll('.btnAcao').forEach(btn => {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
}

iniciar();

document.querySelectorAll('.btn').forEach((botao) => {
    document.getElementById(botao.id).addEventListener('click', () => {
        if (jaVotou) return;
        votacao(botao);
    });
});

function votacao(botao) {
    if (!num1.value) {
        num1.innerHTML = botao.value;
        num1.value = botao.value;
        tocar(somNumeros);
        return;
    }
    else if (!num2.value) {
        num2.innerHTML = botao.value;
        num2.value = botao.value;
        tocar(somNumeros);
        mostraCandidato();
    }
}

function mostraCandidato() {
    if (num1.value == '1' && num2.value == '3') {
        nomeTitulo.innerText = candidato.lula.nome;
        nomeCandidato.innerHTML = `Nome: <b>${candidato.lula.nomeCompleto}</b>`;
        partido.innerHTML = `Partido: <b>${candidato.lula.partido}</b>`;
        foto.style.backgroundImage = candidato.lula.foto;
        legenda.style.display = 'flex';
    }
    else if (num1.value == '2' && num2.value == '2') {
        nomeTitulo.innerText = candidato.bolsonaro.nome;
        nomeCandidato.innerHTML = `Nome: <b>${candidato.bolsonaro.nomeCompleto}</b>`;
        partido.innerHTML = `Partido: <b>${candidato.bolsonaro.partido}</b>`;
        foto.style.backgroundImage = candidato.bolsonaro.foto;
        legenda.style.display = 'flex';
    }
    else {
        nomeTitulo.innerText = 'INVALIDO';
        nomeCandidato.innerText = 'INVALIDO';
        partido.innerText = 'INVALIDO';
        foto.style.backgroundImage = "url('./images/person-icon.png')";
        legenda.style.display = 'none';
        num1.value = null;
        num2.value = null;
    }
}

document.getElementById('btnConfirma').addEventListener('click', confirma);

let enviando = false;

async function confirma() {
    if (jaVotou || enviando) return;

    if (document.getElementById('fim').style.display == 'flex') {
        corrige();
    } else {
        if (num1.value != null && num2.value != null) {
            let votoChave = "";

            if (num1.value === '1' && num2.value === '3') {
                votoChave = '13';
            } else if (num1.value === '2' && num2.value === '2') {
                votoChave = '22';
            } else if (num1.value === '0' && num2.value === '0') {
                votoChave = 'BRANCO';
            } else {
                votoChave = 'NULO';
            }

            enviando = true;
            const sucesso = await registrarVotoNoFirebase(votoChave);
            enviando = false;

            if (!sucesso) {
                alert('Não foi possível registrar o voto. Verifique sua conexão e tente novamente.');
                return;
            }

            document.getElementById('fim').style.display = 'flex';
            tocar(somConfirma);

            setTimeout(() => {
                jaVotou = true;
                bloquearVotacao();
                document.getElementById('fim').style.display = 'none';
            }, 2000);

        }
    }
}

// Um único documento por eleitor (votos/{uid}). A contagem é feita a partir desta coleção,
// então o painel e o resultado nunca ficam fora de sincronia.
async function registrarVotoNoFirebase(tipoVoto) {
    if (!userId) return false;
    try {
        await ipPromise;
        await setDoc(doc(db, "votos", userId), {
            tipo: tipoVoto,
            data: new Date().toISOString(),
            ip: userIP,
            regiao: userRegiao
        });
        return true;
    } catch (e) {
        console.error("Erro ao registrar voto:", e);
        if (e && e.code === 'permission-denied') {
            // Já existe voto deste dispositivo
            jaVotou = true;
            bloquearVotacao();
        }
        return false;
    }
}

document.getElementById('btnCorrige').addEventListener('click', corrige);

function corrige() {
    if (jaVotou) return;
    nomeTitulo.innerText = 'CANDIDATO';
    nomeCandidato.innerText = 'Nome:';
    partido.innerText = 'Partido:';
    num1.innerText = '';
    num2.innerText = '';
    num1.value = null;
    num2.value = null;
    tocar(somNumeros);
    foto.style.backgroundImage = "url('./images/person-icon.png')";
    legenda.style.display = 'none';
    document.getElementById('fim').style.display = 'none';
}

document.getElementById('btnBranco').addEventListener('click', votoBranco);

function votoBranco() {
    if (jaVotou) return;
    nomeTitulo.innerText = 'VOTAR EM BRANCO';
    nomeCandidato.innerText = '';
    partido.innerText = '';
    num1.innerText = '0';
    num2.innerText = '0';
    num1.value = '0';
    num2.value = '0';
    tocar(somNumeros);
    foto.style.backgroundImage = "url('./images/person-icon.png')";
    legenda.style.display = 'none';
}

let candidato = {
    lula: {
        nome: 'LULA',
        nomeCompleto: 'LUIS INÁCIO LULA DA SILVA',
        partido: 'PT',
        foto: "url('./images/lula.jpg')",
    },
    bolsonaro: {
        nome: 'BOLSONARO',
        nomeCompleto: 'JAIR MESSIAS BOLSONARO',
        partido: 'PSL',
        foto: "url('./images/bolsonaro.jpg')",
    },
    ciro: {
        nome: 'CIRO GOMES',
        nomeCompleto: 'CIRO FERREIRA GOMES',
        partido: 'PDT',
        foto: "url('./images/ciro.jpg')",
    },
    moro: {
        nome: 'SERGIO MORO',
        nomeCompleto: 'SERGIO FERNANDO MORO',
        partido: 'NOVO',
        foto: "url('./images/moro.jpg')",
    },
};