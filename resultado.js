import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

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

onSnapshot(doc(db, "apuracao", "geral"), (docSnap) => {
    const dados = docSnap.exists() ? docSnap.data() : {};

    const votos13 = dados['13'] || 0;
    const votos22 = dados['22'] || 0;
    const votosBrancos = dados['BRANCO'] || 0;
    const votosNulos = dados['NULO'] || 0;

    const totalVotos = votos13 + votos22 + votosBrancos + votosNulos;

    document.getElementById('totalVotos').innerText = totalVotos;

    atualizarCandidato('13', votos13, totalVotos);
    atualizarCandidato('22', votos22, totalVotos);
    atualizarCandidato('BRANCO', votosBrancos, totalVotos);
    atualizarCandidato('NULO', votosNulos, totalVotos);
});

function atualizarCandidato(id, qtdVotos, total) {
    const porcentagem = total > 0 ? ((qtdVotos / total) * 100).toFixed(1) : 0;
    
    document.getElementById(`votos-${id}`).innerText = `${qtdVotos} votos (${porcentagem}%)`;
    document.getElementById(`bar-${id}`).style.width = `${porcentagem}%`;
}