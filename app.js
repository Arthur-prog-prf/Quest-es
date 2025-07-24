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
let eliminatedAnswers = [];

// =================================================================
// LÓGICA DE SWIPE (MOBILE) - CORRIGIDA E REFINADA
// =================================================================
let touchStartX = 0;
let touchStartY = 0;
let currentX = 0;
let swipedElement = null;
let swipeDirection; // Pode ser 'horizontal', 'vertical' ou undefined
const swipeThreshold = 80; // Distância em pixels para acionar a eliminação

function handleTouchStart(e) {
    const target = e.target.closest('.option-content');
    // Não inicia o swipe se a questão já foi respondida
    if (!target || userAnswers[currentQuestionIndex] !== null) return;
    
    swipedElement = target;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    currentX = touchStartX;
    swipeDirection = undefined; // Reseta a direção a cada novo toque
}

function handleTouchMove(e) {
    if (!swipedElement) return;

    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;

    if (swipeDirection === undefined) {
        if (Math.abs(deltaX) > Math.abs(deltaY) + 5) { // Dá prioridade ao scroll vertical
            swipeDirection = 'horizontal';
            swipedElement.classList.add('swiping');
            const revealElement = swipedElement.previousElementSibling;
            if (revealElement) revealElement.style.opacity = '1';
        } else {
            swipeDirection = 'vertical';
        }
    }

    if (swipeDirection === 'horizontal') {
        e.preventDefault(); 
        let newX = deltaX;
        if (newX < 0) newX = 0; 
        swipedElement.style.transform = `translateX(${newX}px)`;
        currentX = e.touches[0].clientX;
    }
}

function handleTouchEnd() {
    if (!swipedElement || swipeDirection !== 'horizontal') {
        if(swipedElement) {
            swipedElement.classList.remove('swiping');
            swipedElement.style.transform = 'translateX(0px)';
            const revealElement = swipedElement.previousElementSibling;
            if (revealElement) revealElement.style.opacity = '0';
        }
        swipedElement = null;
        return;
    };

    const deltaX = currentX - touchStartX;

    if (deltaX > swipeThreshold) {
        const letter = swipedElement.querySelector('.option').dataset.optionLetter;
        toggleEliminate(letter);
        renderCurrentQuestion(); // **CHAVE DA CORREÇÃO**: Redesenha a tela com o estado atualizado
    } else {
        swipedElement.classList.remove('swiping');
        swipedElement.style.transform = 'translateX(0px)';
        const revealElement = swipedElement.previousElementSibling;
        if(revealElement) revealElement.style.opacity = '0';
    }
    
    swipedElement = null;
}

questionsArea.addEventListener('touchstart', handleTouchStart, { passive: false });
questionsArea.addEventListener('touchmove', handleTouchMove, { passive: false });
questionsArea.addEventListener('touchend', handleTouchEnd);


// =================================================================
// FUNÇÕES PRINCIPAIS DO QUIZ
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
        let query = supabase.from('questoes').select('*').eq('materia', materia);
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
    eliminatedAnswers = Array.from({ length: allQuestions.length }, () => []);

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
    questionElement.className = 'bg-[var(--card-bg-color)] sm:rounded-xl shadow-lg';
    
    // Pergunta
    const questionTextHTML = `
        <div class="question text-xl font-semibold p-4">${question.pergunta}</div>
    `;

    // Alternativas
    let optionsHTML = '';
    options.forEach(option => {
        const isEliminated = currentEliminated.includes(option.letter);
        
        let optionClass = 'option flex items-center space-x-4 p-4 border-t border-[var(--border-color)] transition-all duration-200';
        if (!isAnswered) optionClass += ' cursor-pointer';
        
        if (isEliminated) optionClass += ' eliminated';
        if (isAnswered) {
            if (option.letter === question.gabarito) optionClass += ' correct';
            else if (option.letter === userAnswerLetter) optionClass += ' incorrect';
        }
        
        // Usando variáveis CSS para garantir consistência de cor
        const letterCircle = `
            <div class="option-letter-circle flex-shrink-0 rounded-full h-8 w-8 flex items-center justify-center font-bold transition-colors" style="background-color: var(--option-circle-bg); color: var(--option-circle-text);">
                ${option.letter}
            </div>
        `;

        optionsHTML += `
            <div class="option-container">
                <div class="swipe-reveal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6">
                        <circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line>
                    </svg>
                </div>
                <div class="option-content flex items-center">
                    <button class="eliminate-btn p-3 rounded-full transition-all ${isEliminated ? 'active' : ''}" data-eliminate-letter="${option.letter}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-gray-500 dark:text-gray-400">
                            <circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line>
                        </svg>
                    </button>
                    <div class="${optionClass}" data-option-letter="${option.letter}">
                        ${letterCircle}
                        <span class="option-text flex-1">${option.text}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Botões e Feedback
    const actionsHTML = `
        <div class="p-4">
            ${!isAnswered ? `<button id="resolver-btn" disabled class="w-full text-white bg-gray-400 font-bold py-3 px-4 rounded-lg transition-all duration-300 cursor-not-allowed">Resolver</button>` : ''}
            ${isAnswered ? `
                <div class="feedback mb-4 text-lg font-semibold ${userAnswerLetter === question.gabarito ? 'correct-feedback' : 'incorrect-feedback'}">
                    ${userAnswerLetter === question.gabarito ? '✓ Resposta Correta!' : '✗ Resposta Incorreta!'}
                </div>
                <button class="fundamentacao-btn w-full text-white bg-[var(--primary-color)] hover:bg-[var(--primary-hover-color)] font-bold py-3 px-4 rounded-lg transition">ℹ️ Ver Fundamentação</button>
                <div class="fundamentacao mt-4 p-4 rounded-lg border-l-4 border-[var(--primary-color)]" style="background-color: var(--fundamentacao-bg); color: var(--fundamentacao-text); display: none;">${question.fundamentacao}</div>
            ` : ''}
        </div>
    `;

    questionElement.innerHTML = questionTextHTML + `<div class="options">${optionsHTML}</div>` + actionsHTML;
    questionsArea.appendChild(questionElement);

    if (!isAnswered) {
        const optionElements = questionElement.querySelectorAll('.option');
        const resolverBtn = document.getElementById('resolver-btn');

        optionElements.forEach(el => {
            el.addEventListener('click', () => {
                if (el.classList.contains('eliminated')) return;
                document.querySelectorAll('.option-letter-circle').forEach(c => c.classList.remove('ring-2', 'ring-[var(--primary-color)]'));
                el.querySelector('.option-letter-circle').classList.add('ring-2', 'ring-[var(--primary-color)]');
                
                tempSelectedAnswer = el.dataset.optionLetter;
                resolverBtn.disabled = false;
                resolverBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
                resolverBtn.classList.add('bg-[var(--primary-color)]', 'hover:bg-[var(--primary-hover-color)]');
            });
        });
        
        const eliminateBtns = questionElement.querySelectorAll('.eliminate-btn');
        eliminateBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleEliminate(btn.dataset.eliminateLetter);
                renderCurrentQuestion();
            });
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

// Função unificada para alterar o estado de eliminação
function toggleEliminate(letter) {
    const eliminatedList = eliminatedAnswers[currentQuestionIndex];
    const index = eliminatedList.indexOf(letter);
    if (index > -1) {
        eliminatedList.splice(index, 1);
    } else {
        if (letter !== tempSelectedAnswer) {
             eliminatedList.push(letter);
        }
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
        if (e.key === 'Enter' && e.target.value) {
            validateAndNavigate(e.target.value);
        }
    });
}

// =================================================================
// EVENT LISTENERS GERAIS
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
    let newTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    themeToggleBtn.textContent = newTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro';
    localStorage.setItem('theme', newTheme);
}

themeToggleBtn.addEventListener('click', toggleTheme);
