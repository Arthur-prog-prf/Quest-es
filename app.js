// =================================================================
// CONFIGURAÇÃO DO SUPABASE
// =================================================================
const SUPABASE_URL = 'https://dibhqftndeggtrxbxjsn.supabase.co'; 
// CORREÇÃO: A chave anterior tinha um erro. Por favor, cole a sua chave 'anon' 'public' correta abaixo.
const SUPABASE_ANON_KEY = 'COLE_AQUI_A_SUA_CHAVE_ANON_PUBLIC_CORRETA'; 

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
let eliminatedAnswers = []; // Guarda as alternativas eliminadas

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
        let query = supabase
            .from('questoes')
            .select('*')
            .eq('materia', materia);

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
    eliminatedAnswers = new Array(allQuestions.length).fill([]);
    
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
    const currentEliminated = eliminatedAnswers[currentQuestionIndex];
    
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
        let optionClass = 'option relative flex items-center space-x-4 p-4 border-2 border-[var(--border-color)] rounded-lg transition-all duration-200';
        
        if (!isAnswered) {
             optionClass += ' cursor-pointer';
        }

        if (currentEliminated.includes(option.letter)) {
            optionClass += ' eliminated';
        }
        
        if (isAnswered) {
            if (option.letter === question.gabarito) optionClass += ' correct';
            else if (option.letter === userAnswerLetter) optionClass += ' incorrect';
        }
        
        optionsHTML += `
            <div class="${optionClass}" data-option-letter="${option.letter}">
                <button class="eliminate-btn absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-[var(--card-bg-color)] p-2 rounded-full shadow-md border border-[var(--border-color)] z-10">
                    <svg class="w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7.848 8.473 7.5 12h9l.348-3.527a1.234 1.234 0 0 0-2.42-1.023L12 9.5l-2.428-2.05a1.234 1.234 0 0 0-2.42 1.023Zm-2.27 4.782.348-3.527m2.27 3.527a5.25 5.25 0 0 1-4.598-2.202 1.234 1.234 0 0 0-2.138 1.452l2.23 4.866a1.234 1.234 0 0 0 2.14 0l2.23-4.866a1.234 1.234 0 0 0-2.138-1.452 5.25 5.25 0 0 1-4.598 2.202Zm13.596-2.202a5.25 5.25 0 0 1-4.598-2.202 1.234 1.234 0 0 0-2.138 1.452l2.23 4.866a1.234 1.234 0 0 0 2.14 0l2.23-4.866a1.234 1.234 0 0 0-2.138-1.452Z" />
                    </svg>
                </button>
                <span class="option-letter font-bold text-lg">${option.letter})</span> 
                <span class="option-text flex-1">${option.text}</span>
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

        optionElements.forEach(el => {
            el.addEventListener('click', () => {
                if (el.classList.contains('eliminated')) return;
                optionElements.forEach(opt => opt.classList.remove('ring-2', 'ring-[var(--primary-color)]'));
                el.classList.add('ring-2', 'ring-[var(--primary-color)]');
                tempSelectedAnswer = el.dataset.optionLetter;
                resolverBtn.disabled = false;
                resolverBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
                resolverBtn.classList.add('bg-[var(--primary-color)]', 'hover:bg-[var(--primary-hover-color)]');
            });

            const eliminateBtn = el.querySelector('.eliminate-btn');
            eliminateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleEliminate(el.dataset.optionLetter);
            });

            let touchStartX = 0;
            el.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; });
            el.addEventListener('touchend', (e) => { handleSwipe(el.dataset.optionLetter, touchStartX, e.changedTouches[0].screenX); });
        });

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

function toggleEliminate(letter) {
    const eliminatedList = eliminatedAnswers[currentQuestionIndex];
    const index = eliminatedList.indexOf(letter);
    if (index > -1) {
        eliminatedList.splice(index, 1);
    } else {
        eliminatedList.push(letter);
    }
    renderCurrentQuestion();
}

function handleSwipe(letter, startX, endX) {
    const swipeDistance = endX - startX;
    const swipeThreshold = 50;
    if (Math.abs(swipeDistance) > swipeThreshold) {
        toggleEliminate(letter);
    }
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
    
    goToQuestionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (e.target.value) {
                validateAndNavigate(e.target.value);
            }
        }
    });
}

// =================================================================
// EVENT LISTENERS
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    applyInitialTheme();
    popularFiltros();
});
materiaSelect.addEventListener('change', () => {
    popularAssuntos();
    startBtn.disabled = !materiaSelect.value;
});
assuntoSelect.addEventListener('change', () => {});
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
