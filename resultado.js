import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

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

// Conta direto da coleção "votos" (mesma fonte do painel admin)
onSnapshot(collection(db, "votos"), (querySnapshot) => {
    const contagem = { '13': 0, '22': 0, 'BRANCO': 0, 'NULO': 0 };

    querySnapshot.forEach((docItem) => {
        const tipo = docItem.data().tipo;
        if (tipo in contagem) contagem[tipo]++;
    });

    const totalVotos = contagem['13'] + contagem['22'] + contagem['BRANCO'] + contagem['NULO'];

    document.getElementById('totalVotos').innerText = totalVotos;

    atualizarCandidato('13', contagem['13'], totalVotos);
    atualizarCandidato('22', contagem['22'], totalVotos);
    atualizarCandidato('BRANCO', contagem['BRANCO'], totalVotos);
    atualizarCandidato('NULO', contagem['NULO'], totalVotos);
});

function atualizarCandidato(id, qtdVotos, total) {
    const porcentagem = total > 0 ? ((qtdVotos / total) * 100).toFixed(1) : 0;

    document.getElementById(`votos-${id}`).innerText = `${qtdVotos} votos (${porcentagem}%)`;
    document.getElementById(`bar-${id}`).style.width = `${porcentagem}%`;
}