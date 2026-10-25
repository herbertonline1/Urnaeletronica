import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    getDocs, 
    collection, 
    deleteDoc, 
    setDoc, 
    increment,
    query,
    where,
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

// Ouve os dados consolidados da apuração em tempo real
onSnapshot(doc(db, "apuracao", "geral"), (docSnap) => {
    const dados = docSnap.exists() ? docSnap.data() : {};

    const v13 = Math.max(0, dados['13'] || 0);
    const v22 = Math.max(0, dados['22'] || 0);
    const vBranco = Math.max(0, dados['BRANCO'] || 0);
    const vNulo = Math.max(0, dados['NULO'] || 0);
    const total = v13 + v22 + vBranco + vNulo;

    document.getElementById('totalVotos').innerText = total;
    document.getElementById('votos-13').innerText = v13;
    document.getElementById('votos-22').innerText = v22;
    document.getElementById('votos-BRANCO').innerText = vBranco;
    document.getElementById('votos-NULO').innerText = vNulo;
});

// Ouve a lista de eleitores/IPs cadastrados em tempo real
onSnapshot(collection(db, "votos_por_ip"), (querySnapshot) => {
    const tabelaBody = document.getElementById('tabelaIPs');
    tabelaBody.innerHTML = '';

    if (querySnapshot.empty) {
        tabelaBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum voto registrado ainda.</td></tr>';
        return;
    }

    querySnapshot.forEach((docItem) => {
        const dataDoc = docItem.data();
        const docId = docItem.id;
        const ipOriginal = docId.replace(/_/g, '.');
        const regiao = dataDoc.regiao || 'Não informada';
        const dataFormatada = dataDoc.data ? new Date(dataDoc.data).toLocaleString('pt-BR') : 'Data não informada';
        const tipoVoto = dataDoc.tipoVoto || '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${ipOriginal}</b></td>
            <td>${regiao}</td>
            <td>${dataFormatada}</td>
            <td>
                <button class="btn-danger btn-excluir" data-ipkey="${docId}" data-ip="${ipOriginal}" data-tipovoto="${tipoVoto}">
                    Excluir Voto
                </button>
            </td>
        `;
        tabelaBody.appendChild(tr);
    });

    // Atribui evento de exclusão aos botões criados
    document.querySelectorAll('.btn-excluir').forEach((botao) => {
        botao.addEventListener('click', (e) => {
            const ipKey = e.target.getAttribute('data-ipkey');
            const ipOriginal = e.target.getAttribute('data-ip');
            const tipoVoto = e.target.getAttribute('data-tipovoto');
            excluirVotoEleitor(ipKey, ipOriginal, tipoVoto);
        });
    });
});

// Função para excluir definitivamente o voto e os registros do IP selecionado
async function excluirVotoEleitor(ipKey, ipOriginal, tipoVoto) {
    const confirmacao = confirm(`Deseja realmente apagar o voto do IP ${ipOriginal}? Ele será removido da contagem e o eleitor poderá votar novamente.`);
    
    if (!confirmacao) return;

    try {
        // 1. Apaga a restrição de IP do banco de dados
        await deleteDoc(doc(db, "votos_por_ip", ipKey));

        // 2. Apaga os registros individuais salvos na coleção "votos" para esse IP
        if (ipOriginal) {
            const q = query(collection(db, "votos"), where("ip", "==", ipOriginal));
            const querySnapshot = await getDocs(q);
            const deletePromises = querySnapshot.docs.map((documento) => deleteDoc(documento.ref));
            await Promise.all(deletePromises);
        }

        // 3. Decrementa o tipo de voto da apuração geral
        if (tipoVoto) {
            const apuracaoRef = doc(db, "apuracao", "geral");
            await setDoc(apuracaoRef, {
                [tipoVoto]: increment(-1)
            }, { merge: true });
        }

        alert(`Voto do IP ${ipOriginal} foi totalmente removido do banco de dados e da apuração!`);
    } catch (e) {
        console.error("Erro ao excluir voto:", e);
        alert("Ocorreu um erro ao tentar excluir o voto do banco de dados.");
    }
}

// Botão de ação para zerar todos os dados
document.getElementById('btnZerarVotacao').addEventListener('click', async () => {
    const confirmacao = confirm("Tem certeza de que deseja APAGAR TODOS os registros e zerar a votação completa?");
    if (!confirmacao) return;

    try {
        await setDoc(doc(db, "apuracao", "geral"), {
            '13': 0,
            '22': 0,
            'BRANCO': 0,
            'NULO': 0
        });

        const ipsSnapshot = await getDocs(collection(db, "votos_por_ip"));
        const deleteIPs = ipsSnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deleteIPs);

        const votosSnapshot = await getDocs(collection(db, "votos"));
        const deleteVotos = votosSnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deleteVotos);

        alert("Toda a votação foi zerada do banco de dados com sucesso!");
    } catch (e) {
        console.error("Erro ao zerar votação:", e);
        alert("Erro ao zerar a votação.");
    }
});