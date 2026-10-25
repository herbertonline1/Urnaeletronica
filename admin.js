import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDocs,
    collection,
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

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

function escapeHtml(texto) {
    return String(texto).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Fonte única de verdade: a coleção "votos" (1 documento por eleitor).
// Os totais e a tabela são calculados a partir dela, então sempre batem.
onSnapshot(collection(db, "votos"), (querySnapshot) => {
    const contagem = { '13': 0, '22': 0, 'BRANCO': 0, 'NULO': 0 };
    const registros = [];

    querySnapshot.forEach((docItem) => {
        const dados = docItem.data();
        if (dados.tipo in contagem) contagem[dados.tipo]++;
        registros.push({ id: docItem.id, ...dados });
    });

    const total = contagem['13'] + contagem['22'] + contagem['BRANCO'] + contagem['NULO'];

    document.getElementById('totalVotos').innerText = total;
    document.getElementById('votos-13').innerText = contagem['13'];
    document.getElementById('votos-22').innerText = contagem['22'];
    document.getElementById('votos-BRANCO').innerText = contagem['BRANCO'];
    document.getElementById('votos-NULO').innerText = contagem['NULO'];

    const tabelaBody = document.getElementById('tabelaIPs');
    tabelaBody.innerHTML = '';

    if (registros.length === 0) {
        tabelaBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum voto registrado ainda.</td></tr>';
        return;
    }

    registros.sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));

    registros.forEach((reg) => {
        const ip = reg.ip ? escapeHtml(reg.ip) : 'Não identificado';
        const regiao = escapeHtml(reg.regiao || 'Não informada');
        const dataFormatada = reg.data ? new Date(reg.data).toLocaleString('pt-BR') : 'Data não informada';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${ip}</b></td>
            <td>${regiao}</td>
            <td>${dataFormatada}</td>
            <td>
                <button class="btn-danger btn-excluir" data-id="${escapeHtml(reg.id)}" data-ip="${ip}">
                    Excluir Voto
                </button>
            </td>
        `;
        tabelaBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-excluir').forEach((botao) => {
        botao.addEventListener('click', (e) => {
            excluirVotoEleitor(e.target.getAttribute('data-id'), e.target.getAttribute('data-ip'));
        });
    });
});

// Exclui o voto: a contagem se atualiza sozinha e o eleitor poderá votar novamente.
async function excluirVotoEleitor(id, ip) {
    const confirmacao = confirm(`Deseja realmente apagar o voto de ${ip}? Ele será removido da contagem e o eleitor poderá votar novamente.`);

    if (!confirmacao) return;

    try {
        await deleteDoc(doc(db, "votos", id));
        alert(`Voto de ${ip} foi removido com sucesso!`);
    } catch (e) {
        console.error("Erro ao excluir voto:", e);
        alert("Ocorreu um erro ao tentar excluir o voto do banco de dados.");
    }
}

// Zera tudo (também limpa as coleções antigas, caso ainda existam)
document.getElementById('btnZerarVotacao').addEventListener('click', async () => {
    const confirmacao = confirm("Tem certeza de que deseja APAGAR TODOS os registros e zerar a votação completa?");
    if (!confirmacao) return;

    try {
        for (const nome of ["votos", "votos_por_ip", "apuracao"]) {
            const snapshot = await getDocs(collection(db, nome));
            await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
        }

        alert("Toda a votação foi zerada do banco de dados com sucesso!");
    } catch (e) {
        console.error("Erro ao zerar votação:", e);
        alert("Erro ao zerar a votação.");
    }
});