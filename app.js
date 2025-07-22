// =================================================================
// CONFIGURAÇÃO DO SUPABASE
// =================================================================
const SUPABASE_URL = 'https://dibhqftndeggtrxbxjsn.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpYmhxZnRuZGVnZ3RyeGJ4anNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDg5NTAsImV4cCI6MjA2NzkyNDk1MH0.WV-UK5Au_Hhqp8R6D2mjwiRBtICrmISXoMgSCmx4ZgQ'; 

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
const selectionArea = document.getElementById('selection-area');

// =================================================================
// ESTADO DO QUIZ
// =================================================================
let allQuestions = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let materiasEAssuntos = [];
let fontSize = 16;
let tempSelectedAnswer = null;

// =================================================================
// FUNÇÕES PRINCIPAIS
// =================================================================

async function popularFiltros() {
    try {
        const { data, error } = await supabase.from('questoes').select('materia, assunto');
        if (error) throw error;
        materiasEAssuntos = data;
        const materiasUnicas = [...new Set(data.map(item => item.materia))];
        materiaSelect.innerHTML = '<option value="">-- Selecione a Matéria --</option>';
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

function popularAssuntos() {
    const materiaSelecionada = materiaSelect.value;
    // CORREÇÃO PONTO 2: Adicionada a opção "Todos os Assuntos"
    assuntoSelect.innerHTML = '<option value="todos">-- Todos os Assuntos --</option>';
    assuntoSelect.disabled = true;
    
    if (materiaSelecionada) {
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

async function fetchQuestions() {
    const materia = materiaSelect.value;
    const assunto = assuntoSelect.value;

    if (!materia) {
        alert('Por favor, selecione uma matéria.');
        return;
    }

    startBtn.textContent = 'A carregar...';
    startBtn.disabled = true;

    try {
        // CORREÇÃO PONTO 2: A query agora é construída dinamicamente
        let query = supabase
            .from('questoes')
            .select('*')
            .eq('materia', materia);

        // Se um assunto específico (diferente de 'todos') for selecionado, adiciona o filtro
        if (assunto && assunto !== 'todos') {
            query = query.eq('assunto', assunto);
        }

        const { data, error } = await query;

        if (error) throw error;

        allQuestions = data;
        startQuiz();

    } catch (error) {
        alert('Erro ao carregar as questões: ' + error.message);
    } finally {
        startBtn.textContent = 'Iniciar Exercício';
    }
}

function startQuiz() {
    if (allQuestions.length === 0) {
        alert('Nenhuma questão encontrada para esta seleção.');
        return;
    }
    currentQuestionIndex = 0;
    userAnswers = new Array(allQuestions.length).fill(null);
    
    selectionArea.classList.add('hidden');
    quizArea.classList.remove('hidden');
    navigationDiv.classList.remove('hidden');
    
    totalQuestionsSpan.textContent = allQuestions.length;
    goToQuestionInput.placeholder = `Ir para questão`;

    renderCurrentQuestion();
    setupQuestionNavigation();
}

function renderCurrentQuestion() {
    questionsArea.innerHTML = '';
    updateProgress();
    tempSelectedAnswer = null;

    const question = allQuestions[currentQuestionIndex];
    const isAnswered = userAnswers[currentQuestionIndex] !== null;
    const userAnswerLetter = userAnswers[currentQuestionIndex];
    
    const options = [
        { letter: 'A', text: question.alternativa_a },
        { letter: 'B', text: question.alternativa_b },
        { letter: 'C', text: question.alternativa_c },
        { letter: 'D', text: question.alternativa_d }
    ];

    const questionElement = document.createElement('div');
    questionElement.className = 'bg-[var(--card-bg-color)] p-6 sm:p-8 rounded-xl shadow-lg';
    
    let optionsHTML = '';
    options.forEach(option => {
        let optionClass = 'option flex items-start space-x-4 p-4 border-2 border-[var(--border-color)] rounded-lg transition-all duration-200 cursor-pointer';
        
        if (isAnswered) {
            if (option.letter === question.gabarito) optionClass += ' correct';
            else if (option.letter === userAnswerLetter) optionClass += ' incorrect';
        }
        
        optionsHTML += `
            <div class="${optionClass}" data-option-letter="${option.letter}">
                <span class="font-bold text-lg">${option.letter})</span> 
                <span class="flex-1">${option.text}</span>
            </div>
        `;
    });

    const resolverBtnHTML = !isAnswered ? `
        <button id="resolver-btn" disabled class="mt-6 w-full text-white bg-gray-400 font-bold py-3 px-4 rounded-lg transition-all duration-300 cursor-not-allowed">
            Resolver
        </button>
    ` : '';

    questionElement.innerHTML = `
        <div class="question text-xl font-semibold mb-6 pb-4 border-b border-[var(--border-color)]">
            ${question.pergunta}
        </div>
        <div class="options space-y-4">${optionsHTML}</div>
        ${resolverBtnHTML}
        ${isAnswered ? `
            <div class="feedback mt-6 text-lg font-semibold ${userAnswerLetter === question.gabarito ? 'correct-feedback' : 'incorrect-feedback'}">
                ${userAnswerLetter === question.gabarito ? '✓ Resposta Correta!' : '✗ Resposta Incorreta!'}
            </div>
            <button class="fundamentacao-btn mt-4 w-full text-white bg-[var(--primary-color)] hover:bg-[var(--primary-hover-color)] font-bold py-3 px-4 rounded-lg transition">ℹ️ Ver Fundamentação</button>
            <div class="fundamentacao mt-4 p-4 rounded-lg border-l-4 border-[var(--primary-color)]" style="background-color: var(--fundamentacao-bg); color: var(--fundamentacao-text); display: none;">${question.fundamentacao}</div>
        ` : ''}
    `;

    questionsArea.appendChild(questionElement);

    if (!isAnswered) {
        const optionElements = questionElement.querySelectorAll('.option');
        const resolverBtn = document.getElementById('resolver-btn');

        optionElements.forEach(el => el.addEventListener('click', () => {
            optionElements.forEach(opt => opt.classList.remove('ring-2', 'ring-[var(--primary-color)]'));
            el.classList.add('ring-2', 'ring-[var(--primary-color)]');
            
            tempSelectedAnswer = el.dataset.optionLetter;
            resolverBtn.disabled = false;
            resolverBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
            resolverBtn.classList.add('bg-[var(--primary-color)]', 'hover:bg-[var(--primary-hover-color)]');
        }));

        resolverBtn.addEventListener('click', () => {
            if (tempSelectedAnswer) {
                userAnswers[currentQuestionIndex] = tempSelectedAnswer;
                renderCurrentQuestion();
            }
        });

    } else {
        const fundBtn = questionElement.querySelector('.fundamentacao-btn');
        if (fundBtn) {
            fundBtn.addEventListener('click', () => {
                const fundBox = questionElement.querySelector('.fundamentacao');
                fundBox.style.display = (fundBox.style.display === 'none') ? 'block' : 'none';
            });
        }
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
            goToQuestionInput.classList.remove('error');
            goToQuestionInput.value = '';
            goToQuestionInput.placeholder = `Ir para questão`;
            goToQuestionInput.blur();
        } else {
            goToQuestionInput.classList.add('error');
            goToQuestionInput.value = '';
            goToQuestionInput.placeholder = `Inválido`;
            setTimeout(() => {
                goToQuestionInput.classList.remove('error');
                goToQuestionInput.placeholder = `Ir para questão`;
            }, 2000);
        }
    };
    goToQuestionInput.addEventListener('change', (e) => validateAndNavigate(e.target.value));
    goToQuestionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') validateAndNavigate(e.target.value);
    });
}

// =================================================================
// EVENT LISTENERS
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    applyInitialTheme();
    popularFiltros();
});

// CORREÇÃO PONTO 2: O botão de iniciar é ativado assim que uma matéria é selecionada
materiaSelect.addEventListener('change', () => {
    popularAssuntos();
    startBtn.disabled = !materiaSelect.value;
});

assuntoSelect.addEventListener('change', () => {
    // Este listener agora é redundante, mas não prejudica.
    // A lógica principal está no listener da matéria.
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

function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleBtn.textContent = 'Modo Claro';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggleBtn.textContent = 'Modo Escuro';
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    let newTheme = 'light';
    if (document.body.classList.contains('dark-mode')) {
        newTheme = 'dark';
        themeToggleBtn.textContent = 'Modo Claro';
    } else {
        themeToggleBtn.textContent = 'Modo Escuro';
    }
    localStorage.setItem('theme', newTheme);
}

themeToggleBtn.addEventListener('click', toggleTheme);
