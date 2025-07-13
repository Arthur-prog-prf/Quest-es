// =================================================================
// CONFIGURAÇÃO DO SUPABASE
// =================================================================
// Suas credenciais foram inseridas abaixo.
const SUPABASE_URL = 'https://dibhqftndeggtrxbxjsn.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpYmhxZnRuZGVnZ3RyeGJ4anNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDg5NTAsImV4cCI6MjA2NzkyNDk1MH0.WV-UK5Au_Hhqp8R6D2mjwiRBtICrmISXoMgSCmx4ZgQ'; 

// Inicializa a conexão com o Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =================================================================
// ELEMENTOS DO DOM
// =================================================================
const startBtn = document.getElementById('start-btn');
const materiaSelect = document.getElementById('materia-select');
const assuntoSelect = document.getElementById('assunto-select');
const quizArea = document.getElementById('quiz-area');
const questionsArea = document.getElementById('questions-area');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const currentQuestionSpan = document.getElementById('current-question');
const totalQuestionsSpan = document.getElementById('total-questions');
const goToQuestionInput = document.getElementById('go-to-question');
const navigationDiv = document.querySelector('.navigation');
const decreaseFontBtn = document.getElementById('decrease-font');
const increaseFontBtn = document.getElementById('increase-font');
const themeToggleBtn = document.getElementById('theme-toggle');

// =================================================================
// ESTADO DO QUIZ
// =================================================================
let allQuestions = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let materiasEAssuntos = []; // Para guardar os filtros
let fontSize = 16;

// =================================================================
// FUNÇÕES PRINCIPAIS
// =================================================================

/**
 * Roda quando a página carrega. Busca as matérias e assuntos disponíveis.
 */
async function popularFiltros() {
    try {
        const { data, error } = await supabase
            .from('questoes')
            .select('materia, assunto'); // Pede apenas as colunas que nos interessam

        if (error) throw error;

        materiasEAssuntos = data;
        
        // Pega uma lista de matérias únicas
        const materiasUnicas = [...new Set(data.map(item => item.materia))];
        
        materiaSelect.innerHTML = '<option value="">-- Selecione a Matéria --</option>'; // Opção padrão
        materiasUnicas.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia;
            option.textContent = materia;
            materiaSelect.appendChild(option);
        });

    } catch (error) {
        materiaSelect.innerHTML = '<option value="">-- Erro ao carregar --</option>';
        alert('Não foi possível carregar as matérias: ' + error.message);
    }
}

/**
 * Roda quando o usuário escolhe uma matéria. Popula o filtro de assuntos.
 */
function popularAssuntos() {
    const materiaSelecionada = materiaSelect.value;
    assuntoSelect.innerHTML = '<option value="">-- Escolha um Assunto --</option>';
    assuntoSelect.disabled = true;
    startBtn.disabled = true;

    if (materiaSelecionada) {
        // Filtra os assuntos que pertencem à matéria selecionada
        const assuntosDaMateria = [...new Set(materiasEAssuntos
            .filter(item => item.materia === materiaSelecionada)
            .map(item => item.assunto)
        )];

        assuntosDaMateria.forEach(assunto => {
            const option = document.createElement('option');
            option.value = assunto;
            option.textContent = assunto;
            assuntoSelect.appendChild(option);
        });
        assuntoSelect.disabled = false;
    }
}

/**
 * Busca as questões filtradas do banco de dados.
 */
async function fetchQuestions() {
    const materia = materiaSelect.value;
    const assunto = assuntoSelect.value;

    if (!materia || !assunto) {
        alert('Por favor, selecione uma matéria e um assunto.');
        return;
    }

    startBtn.textContent = 'Carregando...';
    startBtn.disabled = true;

    try {
        const { data, error } = await supabase
            .from('questoes')
            .select('*')
            .eq('materia', materia) // Filtra pela matéria
            .eq('assunto', assunto); // Filtra pelo assunto

        if (error) throw error;

        allQuestions = data;
        startQuiz();

    } catch (error) {
        alert('Erro ao carregar as questões: ' + error.message);
    } finally {
        startBtn.textContent = 'Iniciar Exercício';
        // O botão continuará desabilitado até uma nova seleção
    }
}

/**
 * Inicia a interface do quiz com as questões carregadas.
 */
function startQuiz() {
    if (allQuestions.length === 0) {
        alert('Nenhuma questão encontrada para esta seleção.');
        return;
    }
    
    currentQuestionIndex = 0;
    userAnswers = new Array(allQuestions.length).fill(null);
    
    document.getElementById('quiz-description').classList.add('hidden');
    document.querySelectorAll('.control-group').forEach(el => el.style.display = 'none');

    quizArea.classList.remove('hidden');
    navigationDiv.classList.remove('hidden');
    
    totalQuestionsSpan.textContent = allQuestions.length;
    renderCurrentQuestion();
    setupQuestionNavigation();
}

/**
 * Mostra a questão atual na tela.
 */
function renderCurrentQuestion() {
    questionsArea.innerHTML = '';
    updateProgress();

    const question = allQuestions[currentQuestionIndex];
    const isAnswered = userAnswers[currentQuestionIndex] !== null;
    const userAnswerLetter = userAnswers[currentQuestionIndex];
    
    const options = [
        { letter: 'A', text: question.alternativa_a },
        { letter: 'B', text: question.alternativa_b },
        { letter: 'C', text: question.alternativa_c },
        { letter: 'D', text: question.alternativa_d }
    ];

    let optionsHTML = '';
    options.forEach(option => {
        let optionClass = 'option';
        if (isAnswered) {
            if (option.letter === question.gabarito) optionClass += ' correct';
            else if (option.letter === userAnswerLetter) optionClass += ' incorrect';
        }
        optionsHTML += `<div class="${optionClass}" data-option-letter="${option.letter}"><span class="option-letter">${option.letter})</span> ${option.text}</div>`;
    });

    questionsArea.innerHTML = `
        <div class="question-container">
            <div class="question">Questão ${currentQuestionIndex + 1} - ${question.pergunta}</div>
            <div class="options">${optionsHTML}</div>
            ${isAnswered ? `
                <div class="feedback ${userAnswerLetter === question.gabarito ? 'correct-feedback' : 'incorrect-feedback'}">
                    ${userAnswerLetter === question.gabarito ? '✓ Resposta Correta!' : '✗ Resposta Incorreta!'}
                </div>
                <button class="fundamentacao-btn">ℹ️ Ver Fundamentação</button>
                <div class="fundamentacao">${question.fundamentacao}</div>
            ` : ''}
        </div>
    `;

    if (!isAnswered) {
        questionsArea.querySelectorAll('.option').forEach(el => el.addEventListener('click', (e) => {
            const selectedLetter = e.currentTarget.dataset.optionLetter;
            userAnswers[currentQuestionIndex] = selectedLetter;
            renderCurrentQuestion();
        }));
    } else {
        const fundBtn = questionsArea.querySelector('.fundamentacao-btn');
        if (fundBtn) fundBtn.addEventListener('click', () => questionsArea.querySelector('.fundamentacao').classList.toggle('show'));
    }
    updateNavigationButtons();
}

function updateNavigationButtons() {
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex >= allQuestions.length - 1;
    goToQuestionInput.max = allQuestions.length;
    goToQuestionInput.min = 1;
    goToQuestionInput.value = '';
}

function updateProgress() {
    currentQuestionSpan.textContent = currentQuestionIndex + 1;
}

function setupQuestionNavigation() {
    const validateAndNavigate = (value) => {
        const qNum = parseInt(value, 10);
        if (qNum >= 1 && qNum <= allQuestions.length) {
            currentQuestionIndex = qNum - 1;
            renderCurrentQuestion();
            goToQuestionInput.value = '';
            goToQuestionInput.blur(); // Tira o foco do input
        } else {
            goToQuestionInput.value = '';
        }
    };
    goToQuestionInput.addEventListener('change', (e) => validateAndNavigate(e.target.value));
}

// =================================================================
// EVENT LISTENERS
// =================================================================

// Roda a função para popular os filtros assim que a página carregar
document.addEventListener('DOMContentLoaded', popularFiltros);

// Quando o usuário muda a matéria, popula os assuntos
materiaSelect.addEventListener('change', popularAssuntos);

// Quando o usuário muda o assunto, habilita o botão de iniciar
assuntoSelect.addEventListener('change', () => {
    startBtn.disabled = !assuntoSelect.value;
});

startBtn.addEventListener('click', fetchQuestions);

prevBtn.addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderCurrentQuestion();
    }
});

nextBtn.addEventListener('click', () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
        currentQuestionIndex++;
        renderCurrentQuestion();
    }
});

// Controles de Acessibilidade
decreaseFontBtn.addEventListener('click', () => {
    if (fontSize > 12) {
        fontSize -= 2;
        document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
    }
});

increaseFontBtn.addEventListener('click', () => {
    if (fontSize < 24) {
        fontSize += 2;
        document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
    }
});

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    themeToggleBtn.textContent = document.body.classList.contains('dark-mode') ? 'Modo Claro' : 'Modo Escuro';
});
