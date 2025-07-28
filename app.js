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
const goToQuestionInput = document.getElementById('go-to-question');
const navigationDiv = document.querySelector('.navigation');
const decreaseFontBtn = document.getElementById('decrease-font');
const increaseFontBtn = document.getElementById('increase-font');
const themeToggleBtn = document.getElementById('theme-toggle');
const selectionArea = document.getElementById('selection-area');
const progressBar = document.getElementById('progress-bar');
const resultsArea = document.getElementById('results-area');
const scorePercentage = document.getElementById('score-percentage');
const scoreText = document.getElementById('score-text');
const reviewErrorsBtn = document.getElementById('review-errors-btn');
const restartQuizBtn = document.getElementById('restart-quiz-btn');
const newQuizBtn = document.getElementById('new-quiz-btn');
const questionCounterText = document.getElementById('question-counter-text');
const toastContainer = document.getElementById('toast-container');
const skeletonLoader = document.getElementById('skeleton-loader');
const resumeModal = document.getElementById('resume-modal');
const resumeBtn = document.getElementById('resume-btn');
const startNewBtn = document.getElementById('start-new-btn');
const themeIconLight = document.getElementById('theme-icon-light');
const themeIconDark = document.getElementById('theme-icon-dark');
const modeSelector = document.getElementById('mode-selector');
const finishListBtnContainer = document.getElementById('finish-list-btn-container');
const finishListBtn = document.getElementById('finish-list-btn');

// =================================================================
// ESTADO DO QUIZ
// =================================================================
let originalQuestions = [];
let allQuestions = [];
let userAnswers = [];
let originalUserAnswers = [];
let currentQuestionIndex = 0;
let materiasEAssuntos = [];
let fontSize = 16;
let tempSelectedAnswer = null;
let eliminatedAnswers = [];
let quizMode = 'single'; // 'single' ou 'list'

// =================================================================
// FUNÇÕES DE QUALIDADE DE VIDA
// =================================================================

function showToast(message, type = 'error', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, duration);
}

function saveProgress() {
    // Salva o progresso apenas para o modo 'single'
    if (quizMode !== 'single') return;
    const progress = {
        originalQuestions,
        allQuestions,
        userAnswers,
        originalUserAnswers,
        currentQuestionIndex,
        eliminatedAnswers,
        timestamp: new Date().getTime()
    };
    localStorage.setItem('quizProgress', JSON.stringify(progress));
}

function clearProgress() {
    localStorage.removeItem('quizProgress');
}

function loadProgress() {
    const savedProgress = localStorage.getItem('quizProgress');
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        const oneDay = 24 * 60 * 60 * 1000;
        // Expira o progresso salvo após 1 dia
        if (new Date().getTime() - progress.timestamp > oneDay) {
            clearProgress();
            return;
        }
        
        resumeModal.classList.remove('hidden');

        resumeBtn.onclick = () => {
            originalQuestions = progress.originalQuestions;
            allQuestions = progress.allQuestions;
            userAnswers = progress.userAnswers;
            originalUserAnswers = progress.originalUserAnswers;
            currentQuestionIndex = progress.currentQuestionIndex;
            eliminatedAnswers = progress.eliminatedAnswers;
            
            quizMode = 'single'; // Força o modo 'single' ao retomar
            selectionArea.classList.add('hidden');
            quizArea.classList.remove('hidden');
            
            startQuizUI();
            resumeModal.classList.add('hidden');
        };

        startNewBtn.onclick = () => {
            clearProgress();
            resumeModal.classList.add('hidden');
        };
    }
}

// =================================================================
// LÓGICA DE SWIPE (MOBILE)
// =================================================================
let touchStartX = 0, touchStartY = 0, currentX = 0, swipedElement = null, swipeDirection;
const swipeThreshold = 80;

function handleTouchStart(e) {
    if (quizMode !== 'single') return;
    const target = e.target.closest('.option-content');
    if (!target || userAnswers[currentQuestionIndex] !== null) return;
    swipedElement = target;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    currentX = touchStartX;
    swipeDirection = undefined;
}

function handleTouchMove(e) {
    if (!swipedElement) return;
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    if (swipeDirection === undefined) {
        if (Math.abs(deltaX) > Math.abs(deltaY) + 5) {
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
        if (swipedElement) {
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
        renderCurrentQuestion(true);
    } else {
        swipedElement.classList.remove('swiping');
        swipedElement.style.transform = 'translateX(0px)';
        const revealElement = swipedElement.previousElementSibling;
        if (revealElement) revealElement.style.opacity = '0';
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
        const materiasUnicas = [...new Set(data.map(item => item.materia))].sort();
        materiaSelect.innerHTML = '<option value="">-- Selecione a Matéria --</option>';
        materiasUnicas.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia;
            option.textContent = materia;
            materiaSelect.appendChild(option);
        });
    } catch (error) {
        showToast('Não foi possível carregar as matérias: ' + error.message);
        materiaSelect.innerHTML = '<option value="">-- Erro ao carregar --</option>';
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
        )].sort();
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
        showToast('Por favor, selecione uma matéria.');
        return;
    }
    
    selectionArea.classList.add('hidden');
    skeletonLoader.classList.remove('hidden');

    try {
        let query = supabase.from('questoes').select('*').eq('materia', materia);
        if (assunto && assunto !== 'todos') {
            query = query.eq('assunto', assunto);
        }
        const { data, error } = await query;
        if (error) throw error;
        if (data.length === 0) throw new Error("Nenhuma questão encontrada para a seleção atual.");
        
        originalQuestions = data; 
        startQuiz(originalQuestions, true);
    } catch (error) {
        showToast('Erro ao carregar as questões: ' + error.message);
        selectionArea.classList.remove('hidden');
    } finally {
        skeletonLoader.classList.add('hidden');
    }
}

function startQuiz(questions, isOriginalQuiz = false) {
    clearProgress();
    allQuestions = [...questions]; 
    currentQuestionIndex = 0;
    userAnswers = new Array(allQuestions.length).fill(null);
    eliminatedAnswers = Array.from({ length: allQuestions.length }, () => []);

    if (isOriginalQuiz) {
        originalUserAnswers = new Array(originalQuestions.length).fill(null);
    }

    selectionArea.classList.add('hidden');
    resultsArea.classList.add('hidden');
    quizArea.classList.remove('hidden');
    
    startQuizUI();
}

function startQuizUI() {
    if (quizMode === 'single') {
        navigationDiv.classList.remove('hidden');
        progressBar.classList.remove('hidden');
        questionCounterText.classList.remove('hidden');
        finishListBtnContainer.classList.add('hidden');
        goToQuestionInput.placeholder = `Ir para questão`;
        renderProgressBar();
        renderCurrentQuestion();
        setupQuestionNavigation();
    } else { // 'list' mode
        navigationDiv.classList.add('hidden');
        progressBar.classList.add('hidden');
        questionCounterText.classList.add('hidden');
        finishListBtnContainer.classList.remove('hidden');
        renderAllQuestions();
    }
}

function renderCurrentQuestion(preserveSelection = false) {
    questionsArea.innerHTML = '';
    updateProgressBar();
    questionCounterText.innerHTML = `Questão <strong>${currentQuestionIndex + 1}</strong> de <strong>${allQuestions.length}</strong>`;

    if (!preserveSelection) tempSelectedAnswer = null;

    const question = allQuestions[currentQuestionIndex];
    const questionHTML = createQuestionHTML(question, currentQuestionIndex, true);
    questionsArea.innerHTML = questionHTML;

    addQuestionEventListeners(questionsArea, currentQuestionIndex, true);
    updateNavigationButtons();
}

function renderAllQuestions() {
    questionsArea.innerHTML = '';
    allQuestions.forEach((question, index) => {
        const questionContainer = document.createElement('div');
        questionContainer.id = `question-container-${index}`;
        questionContainer.innerHTML = createQuestionHTML(question, index, false);
        questionsArea.appendChild(questionContainer);
        addQuestionEventListeners(questionContainer, index, false);
    });
}

function createQuestionHTML(question, index, isSingleMode) {
    const isAnswered = isSingleMode && userAnswers[index] !== null;
    const userAnswerLetter = userAnswers[index];
    const currentEliminated = eliminatedAnswers[index] || [];
    
    const options = [
        { letter: 'A', text: question.alternativa_a },
        { letter: 'B', text: question.alternativa_b },
        { letter: 'C', text: question.alternativa_c },
        { letter: 'D', text: question.alternativa_d }
    ];

    const questionHeader = isSingleMode ? '' : `<div class="flex justify-between items-center p-4 border-b border-[var(--border-color)]"><h3 class="text-lg font-bold">Questão ${index + 1}</h3><span class="text-sm text-secondary">${question.assunto}</span></div>`;
    const questionTextHTML = `<div class="question text-xl font-semibold p-4">${question.pergunta}</div>`;
    
    let optionsHTML = '';
    options.forEach(option => {
        const isEliminated = currentEliminated.includes(option.letter);
        const containerClass = isAnswered ? 'option-container is-answered' : 'option-container';
        
        let isSelected = false;
        if(isSingleMode) {
            isSelected = tempSelectedAnswer === option.letter;
        } else {
            isSelected = userAnswers[index] === option.letter;
        }

        const contentClass = `option-content flex items-center ${isSelected ? 'is-selected' : ''}`;
        
        let optionClass = 'option flex flex-1 items-center space-x-4 p-4 border-t border-[var(--border-color)] transition-all duration-200';
        if (!isAnswered) optionClass += ' cursor-pointer';
        if (isEliminated) optionClass += ' eliminated';
        
        if (isAnswered) {
            if (option.letter === question.gabarito) optionClass += ' correct';
            else if (option.letter === userAnswerLetter) optionClass += ' incorrect';
        }
        
        const letterCircle = `<div class="option-letter-circle flex-shrink-0 rounded-full h-8 w-8 flex items-center justify-center font-bold transition-colors" style="background-color: var(--option-circle-bg); color: var(--option-circle-text);">${option.letter}</div>`;
        
        const eliminateButton = isSingleMode ? `<button class="eliminate-btn p-3 rounded-full transition-all ${isEliminated ? 'active' : ''}" data-eliminate-letter="${option.letter}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-gray-500 dark:text-gray-400"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg></button>` : '';
        const swipeRevealDiv = isSingleMode ? `<div class="swipe-reveal"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg></div>` : '';

        optionsHTML += `<div class="${containerClass}">${swipeRevealDiv}<div class="${contentClass}">${eliminateButton}<div class="${optionClass}" data-option-letter="${option.letter}" data-question-index="${index}">${letterCircle}<span class="option-text flex-1">${option.text}</span></div></div></div>`;
    });

    const resolverBtnEnabled = tempSelectedAnswer !== null;
    const actionsHTML = isSingleMode ? `<div class="p-4">${!isAnswered ? `<button id="resolver-btn" ${!resolverBtnEnabled ? 'disabled' : ''} class="w-full text-white ${resolverBtnEnabled ? 'bg-[var(--primary-color)] hover:bg-[var(--primary-hover-color)]' : 'bg-gray-400 cursor-not-allowed'} font-bold py-3 px-4 rounded-lg transition-all duration-300">Resolver</button>` : `<div class="feedback mb-4 text-lg font-semibold ${userAnswerLetter === question.gabarito ? 'correct-feedback' : 'incorrect-feedback'}">${userAnswerLetter === question.gabarito ? '✓ Resposta Correta!' : '✗ Resposta Incorreta!'}</div><button class="fundamentacao-btn w-full text-white bg-[var(--primary-color)] hover:bg-[var(--primary-hover-color)] font-bold py-3 px-4 rounded-lg transition">ℹ️ Ver Fundamentação</button><div class="fundamentacao mt-4 p-4 rounded-lg border-l-4 border-[var(--primary-color)]" style="background-color: var(--fundamentacao-bg); color: var(--fundamentacao-text); display: none;">${question.fundamentacao}</div>`}</div>` : '';
    
    return `<div class="bg-[var(--card-bg-color)] sm:rounded-xl shadow-lg">${questionHeader}${questionTextHTML}<div class="options">${optionsHTML}</div>${actionsHTML}</div>`;
}


function addQuestionEventListeners(element, index, isSingleMode) {
    if (isSingleMode) {
        // Modo Questão por Questão
        const isAnswered = userAnswers[index] !== null;
        if (!isAnswered) {
            element.querySelectorAll('.option').forEach(el => {
                el.addEventListener('click', () => {
                    if (el.classList.contains('eliminated')) return;
                    tempSelectedAnswer = el.dataset.optionLetter;
                    renderCurrentQuestion(true);
                });
            });
            element.querySelectorAll('.eliminate-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleEliminate(btn.dataset.eliminateLetter);
                    renderCurrentQuestion(true);
                });
            });
            const resolverBtn = element.querySelector('#resolver-btn');
            if (resolverBtn) {
                resolverBtn.addEventListener('click', () => {
                    if (tempSelectedAnswer) {
                        handleAnswer(index, tempSelectedAnswer);
                        renderCurrentQuestion();
                    }
                });
            }
        } else {
            const fundBtn = element.querySelector('.fundamentacao-btn');
            if (fundBtn) fundBtn.addEventListener('click', () => {
                const fundBox = element.querySelector('.fundamentacao');
                fundBox.style.display = (fundBox.style.display === 'none') ? 'block' : 'none';
            });
        }
    } else {
        // Modo Lista Completa
        element.querySelectorAll('.option').forEach(el => {
            el.addEventListener('click', () => {
                const questionIndex = parseInt(el.dataset.questionIndex, 10);
                const selectedLetter = el.dataset.optionLetter;
                handleAnswer(questionIndex, selectedLetter);
                
                const parentQuestionContainer = document.getElementById(`question-container-${questionIndex}`);
                const optionsContainer = parentQuestionContainer.querySelector('.options');
                
                optionsContainer.querySelectorAll('.option-content').forEach(opt => opt.classList.remove('is-selected'));
                el.closest('.option-content').classList.add('is-selected');
            });
        });
    }
}

function handleAnswer(index, letter) {
    userAnswers[index] = letter;
    const originalIndex = originalQuestions.findIndex(q => q.id === allQuestions[index].id);
    if (originalIndex !== -1) {
        originalUserAnswers[originalIndex] = letter;
    }
    if (quizMode === 'single') {
        saveProgress();
        updateProgressBar();
    }
}

function toggleEliminate(letter) {
    const eliminatedList = eliminatedAnswers[currentQuestionIndex];
    const index = eliminatedList.indexOf(letter);
    if (index > -1) {
        eliminatedList.splice(index, 1);
    } else {
        eliminatedList.push(letter);
        if (tempSelectedAnswer === letter) {
            tempSelectedAnswer = null;
        }
    }
}

function renderProgressBar() {
    progressBar.innerHTML = '';
    allQuestions.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'progress-dot';
        dot.dataset.index = index;
        progressBar.appendChild(dot);
    });
    updateProgressBar();
}

function updateProgressBar() {
    if (quizMode !== 'single') return;
    const dots = progressBar.querySelectorAll('.progress-dot');
    dots.forEach((dot, index) => {
        dot.classList.remove('current', 'correct', 'incorrect');
        if (userAnswers[index] !== null) {
            const question = allQuestions[index];
            dot.classList.add(userAnswers[index] === question.gabarito ? 'correct' : 'incorrect');
        }
        if (index === currentQuestionIndex) {
            dot.classList.add('current');
        }
    });
}

function updateNavigationButtons() {
    if (quizMode !== 'single') return;
    prevBtn.disabled = currentQuestionIndex === 0;
    const allCurrentQuestionsAnswered = !userAnswers.includes(null);
    if (allCurrentQuestionsAnswered) {
        nextBtn.querySelector('span').textContent = 'Finalizar';
        nextBtn.disabled = false;
    } else {
        nextBtn.querySelector('span').textContent = 'Próxima';
        nextBtn.disabled = currentQuestionIndex >= allQuestions.length - 1;
    }
    goToQuestionInput.max = allQuestions.length;
    goToQuestionInput.min = 1;
    goToQuestionInput.value = '';
}

function showResults() {
    clearProgress();
    quizArea.classList.add('hidden');
    navigationDiv.classList.add('hidden');
    resultsArea.classList.remove('hidden');

    const correctAnswers = originalUserAnswers.filter((answer, index) => answer === originalQuestions[index].gabarito).length;
    const total = originalQuestions.length;
    const percentage = total > 0 ? Math.round((correctAnswers / total) * 100) : 0;
    scorePercentage.textContent = `${percentage}%`;
    scoreText.textContent = `Você acertou ${correctAnswers} de ${total} questões.`;
    const incorrectQuestions = originalQuestions.filter((_, index) => originalUserAnswers[index] !== null && originalUserAnswers[index] !== originalQuestions[index].gabarito);
    reviewErrorsBtn.disabled = incorrectQuestions.length === 0;
    reviewErrorsBtn.classList.toggle('opacity-50', incorrectQuestions.length === 0);
    reviewErrorsBtn.classList.toggle('cursor-not-allowed', incorrectQuestions.length === 0);
}

function setupQuestionNavigation() {
    const validateAndNavigate = (value) => {
        const qNum = parseInt(value, 10);
        if (qNum >= 1 && qNum <= allQuestions.length) {
            currentQuestionIndex = qNum - 1;
            renderCurrentQuestion();
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
    loadProgress();
});

document.addEventListener('keydown', (e) => {
    if (quizArea.classList.contains('hidden') || quizMode !== 'single') return;
    const isAnswered = userAnswers[currentQuestionIndex] !== null;
    if (isAnswered) {
        if (e.key === 'ArrowRight' && !nextBtn.disabled) nextBtn.click();
        if (e.key === 'ArrowLeft' && !prevBtn.disabled) prevBtn.click();
        return;
    }

    switch(e.key.toLowerCase()) {
        case 'a': document.querySelector('.option[data-option-letter="A"]')?.click(); break;
        case 'b': document.querySelector('.option[data-option-letter="B"]')?.click(); break;
        case 'c': document.querySelector('.option[data-option-letter="C"]')?.click(); break;
        case 'd': document.querySelector('.option[data-option-letter="D"]')?.click(); break;
        case 'enter': document.getElementById('resolver-btn')?.click(); break;
        case 'arrowright': if (!nextBtn.disabled) nextBtn.click(); break;
        case 'arrowleft': if (!prevBtn.disabled) prevBtn.click(); break;
    }
});

modeSelector.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        quizMode = e.target.dataset.mode;
        modeSelector.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
    }
});

materiaSelect.addEventListener('change', () => { popularAssuntos(); startBtn.disabled = !materiaSelect.value; });
startBtn.addEventListener('click', fetchQuestions);
prevBtn.addEventListener('click', () => { if (currentQuestionIndex > 0) { currentQuestionIndex--; renderCurrentQuestion(); } });
nextBtn.addEventListener('click', () => { if (nextBtn.querySelector('span').textContent === 'Finalizar') { showResults(); } else if (currentQuestionIndex < allQuestions.length - 1) { currentQuestionIndex++; renderCurrentQuestion(); } });

// CORREÇÃO: Lógica para o botão de finalizar a lista
finishListBtn.addEventListener('click', () => {
    // 1. Esconde o botão de finalizar
    finishListBtnContainer.classList.add('hidden');

    // 2. Itera por todas as questões para aplicar o feedback
    allQuestions.forEach((question, index) => {
        const questionContainer = document.getElementById(`question-container-${index}`);
        const mainCard = questionContainer.querySelector('.bg-\\[var\\(--card-bg-color\\)\\]');
        const optionsContainer = questionContainer.querySelector('.options');
        const userAnswer = userAnswers[index];

        // 3. Desabilita as opções e aplica as classes de correto/incorreto
        optionsContainer.querySelectorAll('.option').forEach(optionEl => {
            const optionLetter = optionEl.dataset.optionLetter;
            optionEl.classList.remove('cursor-pointer');
            optionEl.style.pointerEvents = 'none'; // Garante que não é clicável

            if (optionLetter === question.gabarito) {
                optionEl.classList.add('correct');
            } else if (optionLetter === userAnswer) {
                optionEl.classList.add('incorrect');
            }
        });

        // 4. Cria e adiciona a seção de fundamentação
        const isCorrect = userAnswer === question.gabarito;
        const feedbackClass = isCorrect ? 'correct-feedback' : 'incorrect-feedback';
        let feedbackText = '';

        if (userAnswer === null) {
            feedbackText = 'Você não respondeu esta questão.';
        } else {
            feedbackText = isCorrect ? '✓ Resposta Correta!' : '✗ Resposta Incorreta!';
        }

        const actionsHTML = `
            <div class="p-4 border-t border-[var(--border-color)]">
                <div class="feedback mb-4 text-lg font-semibold ${feedbackClass}">${feedbackText}</div>
                <button class="fundamentacao-btn w-full text-white bg-[var(--primary-color)] hover:bg-[var(--primary-hover-color)] font-bold py-3 px-4 rounded-lg transition">ℹ️ Ver Fundamentação</button>
                <div class="fundamentacao mt-4 p-4 rounded-lg border-l-4 border-[var(--primary-color)]" style="background-color: var(--fundamentacao-bg); color: var(--fundamentacao-text); display: none;">
                    ${question.fundamentacao}
                </div>
            </div>
        `;
        
        const actionsContainer = document.createElement('div');
        actionsContainer.innerHTML = actionsHTML;
        mainCard.appendChild(actionsContainer);

        // 5. Adiciona o evento de clique para o novo botão de fundamentação
        actionsContainer.querySelector('.fundamentacao-btn').addEventListener('click', () => {
            const fundBox = actionsContainer.querySelector('.fundamentacao');
            fundBox.style.display = (fundBox.style.display === 'none') ? 'block' : 'none';
        });
    });

    // 6. Adiciona um botão no final da página para ir para a tela de resumo
    const summaryBtnHTML = `<div class="mt-8"><button id="go-to-summary-btn" class="w-full text-white bg-gray-500 hover:bg-gray-600 font-bold py-3 px-4 rounded-lg transition-all duration-300">Ver Resumo do Desempenho</button></div>`;
    const summaryContainer = document.createElement('div');
    summaryContainer.innerHTML = summaryBtnHTML;
    questionsArea.appendChild(summaryContainer);
    summaryContainer.querySelector('#go-to-summary-btn').addEventListener('click', showResults);
});


restartQuizBtn.addEventListener('click', () => { startQuiz(originalQuestions, true); });
reviewErrorsBtn.addEventListener('click', () => { const incorrectQuestions = originalQuestions.filter((q, index) => originalUserAnswers[index] !== null && originalUserAnswers[index] !== q.gabarito); if (incorrectQuestions.length > 0) startQuiz(incorrectQuestions, false); });
newQuizBtn.addEventListener('click', () => { resultsArea.classList.add('hidden'); selectionArea.classList.remove('hidden'); });
decreaseFontBtn.addEventListener('click', () => { if (fontSize > 12) { fontSize -= 2; document.documentElement.style.setProperty('--font-size', `${fontSize}px`); } });
increaseFontBtn.addEventListener('click', () => { if (fontSize < 24) { fontSize += 2; document.documentElement.style.setProperty('--font-size', `${fontSize}px`); } });

function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeIconLight.classList.add('hidden');
        themeIconDark.classList.remove('hidden');
    } else {
        document.body.classList.remove('dark-mode');
        themeIconLight.classList.remove('hidden');
        themeIconDark.classList.add('hidden');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    let newTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    if (newTheme === 'dark') {
        themeIconLight.classList.add('hidden');
        themeIconDark.classList.remove('hidden');
    } else {
        themeIconLight.classList.remove('hidden');
        themeIconDark.classList.add('hidden');
    }
    localStorage.setItem('theme', newTheme);
}
themeToggleBtn.addEventListener('click', toggleTheme);
