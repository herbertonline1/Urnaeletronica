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

// ---------- Proteção por senha ----------
// Guardamos apenas o hash SHA-256 da senha (não o texto dela).
const SENHA_HASH = "920e4409f370f27b638393191d396b90ef6f9a69262ba4007e9e2f7a9c5ed1fc";
const CHAVE_SESSAO = "admin_urna_ok";

async function sha256(texto) {
    const bytes = new TextEncoder().encode(texto);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function jaAutenticado() {
    try { return sessionStorage.getItem(CHAVE_SESSAO) === '1'; } catch (e) { return false; }
}

function marcarAutenticado() {
    try { sessionStorage.setItem(CHAVE_SESSAO, '1'); } catch (e) { /* ignora */ }
}

function pedirSenha() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);z-index:9999;';
    overlay.innerHTML = `
        <form id="formSenhaAdmin" style="background:var(--fundo,#ddd);padding:25px;border-radius:10px;font-family:var(--font,sans-serif);color:var(--botoes,#222);width:90%;max-width:340px;box-shadow:0px 4px 10px rgba(0,0,0,0.3);">
            <h2 style="margin-bottom:15px;">ACESSO RESTRITO</h2>
            <input id="inputSenhaAdmin" type="password" placeholder="Digite a senha" autocomplete="off"
                style="width:100%;padding:10px;border-radius:5px;border:1px solid #999;font-size:16px;margin-bottom:10px;">
            <p id="erroSenhaAdmin" style="color:#d9534f;font-size:14px;min-height:18px;margin-bottom:10px;"></p>
            <button type="submit" style="width:100%;padding:10px;border:none;border-radius:5px;background:var(--fundo-botoes,#222);color:var(--branco,#fff);font-weight:bold;cursor:pointer;">ENTRAR</button>
        </form>
    `;
    document.body.appendChild(overlay);

    const form = overlay.querySelector('#formSenhaAdmin');
    const input = overlay.querySelector('#inputSenhaAdmin');
    const erro = overlay.querySelector('#erroSenhaAdmin');
    input.focus();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        let ok = false;
        try {
            ok = (await sha256(input.value)) === SENHA_HASH;
        } catch (err) {
            erro.innerText = 'Abra o painel por https ou localhost.';
            return;
        }
        if (ok) {
            marcarAutenticado();
            overlay.remove();
            liberarPainel();
        } else {
            erro.innerText = 'Senha incorreta.';
            input.value = '';
            input.focus();
        }
    });
}

let painelIniciado = false;

function liberarPainel() {
    document.querySelector('.admin-container').style.display = '';
    if (!painelIniciado) {
        painelIniciado = true;
        iniciarPainel();
    }
}

if (jaAutenticado()) {
    liberarPainel();
} else {
    pedirSenha();
}

// ---------- Painel ----------
function escapeHtml(texto) {
    return String(texto).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function iniciarPainel() {
    // Fonte única de verdade: a coleção "votos" (1 documento por eleitor).
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
}

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