import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, increment, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-E0xStEwuGyBY3-rGCBl09r04uDJeyow",
  authDomain: "urna-65799.firebaseapp.com",
  projectId: "urna-65799",
  storageBucket: "urna-65799.firebasestorage.app",
  messagingSenderId: "306455847436",
  appId: "1:306455847436:web:1d671ab5c0f2352857c429"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

async function verificarIP() {
    try {
        // Busca IP e localização via ipapi.co
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        userIP = data.ip || "";
        if (data.city && data.region_code) {
            userRegiao = `${data.city} - ${data.region_code}`;
        } else if (data.country_name) {
            userRegiao = data.country_name;
        }
        
        if (userIP) {
            const ipKey = userIP.replace(/\./g, '_');
            const docRef = doc(db, "votos_por_ip", ipKey);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                jaVotou = true;
                bloquearVotacao();
            }
        }
    } catch (e) {
        console.error("Erro ao verificar IP/Região:", e);
    }
}

function bloquearVotacao() {
    nomeTitulo.innerText = 'VOTO REGISTRADO';
    nomeCandidato.innerText = 'Seu dispositivo/IP já votou.';
    partido.innerText = '';
    num1.innerText = '';
    num2.innerText = '';
    document.querySelectorAll('.btn, .btnAcao').forEach(btn => btn.disabled = true);
}

verificarIP();

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
        somNumeros.play();
        return;
    }
    else if (!num2.value) {
        num2.innerHTML = botao.value;
        num2.value = botao.value;
        somNumeros.play();
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

async function confirma() {
    if (jaVotou) return;

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

            document.getElementById('fim').style.display = 'flex';
            somConfirma.play();

            await registrarVotoNoFirebase(votoChave);

            setTimeout(() => {
                jaVotou = true;
                bloquearVotacao();
                document.getElementById('fim').style.display = 'none';
            }, 2000);

        }
    }
}

async function registrarVotoNoFirebase(tipoVoto) {
    try {
        await addDoc(collection(db, "votos"), {
            tipo: tipoVoto,
            data: new Date().toISOString(),
            ip: userIP,
            regiao: userRegiao
        });

        const apuracaoRef = doc(db, "apuracao", "geral");
        await setDoc(apuracaoRef, {
            [tipoVoto]: increment(1)
        }, { merge: true });

        if (userIP) {
            const ipKey = userIP.replace(/\./g, '_');
            await setDoc(doc(db, "votos_por_ip", ipKey), {
                votou: true,
                tipoVoto: tipoVoto,
                regiao: userRegiao,
                data: new Date().toISOString()
            });
        }
    } catch (e) {
        console.error("Erro ao registrar voto:", e);
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
    somNumeros.play();
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
    somNumeros.play();
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