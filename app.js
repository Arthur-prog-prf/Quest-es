// =================================================================
// CONFIGURAÇÃO DO SUPABASE
// =================================================================
// !!! IMPORTANTE: Substitua os valores abaixo pelos seus !!!

const SUPABASE_URL = 'COLE_AQUI_A_SUA_URL_DO_SUPABASE'; 
const SUPABASE_ANON_KEY = 'COLE_AQUI_A_SUA_CHAVE_ANON_PUBLIC'; 

// Inicializa o "telefone" para conversar com o Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =================================================================
// ELEMENTOS DO DOM (A INTERFACE)
// =================================================================
const startBtn = document.getElementById('start-btn');
const quizArea = document.getElementById('quiz-area');
const questionsArea = document.getElementById('questions-area');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const currentQuestionSpan = document.getElementById('current-question');
const totalQuestionsSpan = document.getElementById('total-questions');
const decreaseFontBtn = document.getElementById('decrease-font');
const increaseFontBtn = document.getElementById('increase-font');
const themeToggleBtn = document.getElementById('theme-toggle');
const goToQuestionInput = document.getElementById('go-to-question');
const navigationDiv = document.querySelector('.navigation');

// =================================================================
// ESTADO DO QUIZ (A MEMÓRIA DO APP)
// =================================================================
let allQuestions = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let fontSize = 16;

// =================================================================
// LÓGICA PRINCIPAL
// =================================================================

/**
 * Busca as questões do banco de dados Supabase.
 */
async function fetchQuestions() {
    startBtn.textContent = 'Carregando...';
    startBtn.disabled = true;

    try {
        // Faz a "ligação" para o Supabase pedindo todas as questões da tabela 'questoes'
        const { data, error } = await supabase
            .from('questoes')
            .select('*'); // '*' significa "todas as colunas"

        if (error) {
            // Se houver um erro na conexão, avisa o usuário
            throw error;
        }

        if (data) {
            allQuestions = data;
            startQuiz();
        }

    } catch (error) {
        alert('Erro ao carregar as questões: ' + error.message);
    } finally {
        startBtn.textContent = 'Carregar Questões';
        startBtn.disabled = false;
    }
}

/**
 * Inicia a interface do quiz.
 */
function startQuiz() {
    if (allQuestions.length === 0) {
        alert('Nenhuma questão encontrada no banco de dados.');
        return;
    }
    
    currentQuestionIndex = 0;
    userAnswers = new Array(allQuestions.length).fill(null); // Cria um array de respostas vazias
    
    document.getElementById('quiz-description').classList.add('hidden');
    startBtn.classList.add('hidden');
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

    const questionElement = document.createElement('div');
    questionElement.className = 'question-container';
    
    let optionsHTML = '';
    options.forEach(option => {
        let optionClass = 'option';
        if (isAnswered) {
            if (option.letter === question.gabarito) {
                optionClass += ' correct'; // Resposta correta
            } else if (option.letter === userAnswerLetter) {
                optionClass += ' incorrect'; // Resposta incorreta do usuário
            }
        }
        
        optionsHTML += `
            <div class="${optionClass}" data-option-letter="${option.letter}">
                <span class="option-letter">${option.letter})</span> ${option.text}
            </div>
        `;
    });

    questionElement.innerHTML = `
        <div class="question">Questão ${currentQuestionIndex + 1} - ${question.pergunta}</div>
        <div class="options">${optionsHTML}</div>
        ${isAnswered ? `
            <div class="feedback ${userAnswerLetter === question.gabarito ? 'correct-feedback' : 'incorrect-feedback'}">
                ${userAnswerLetter === question.gabarito ? '✓ Resposta Correta!' : '✗ Resposta Incorreta!'}
            </div>
            <button class="fundamentacao-btn">ℹ️ Ver Fundamentação</button>
            <div class="fundamentacao">${question.fundamentacao}</div>
        ` : ''}
    `;

    questionsArea.appendChild(questionElement);

    // Adiciona os eventos de clique apenas se a questão não foi respondida
    if (!isAnswered) {
        questionElement.querySelectorAll('.option').forEach(optionEl => {
            optionEl.addEventListener('click', () => {
                const selectedLetter = optionEl.dataset.optionLetter;
                userAnswers[currentQuestionIndex] = selectedLetter;
                renderCurrentQuestion(); // Re-renderiza para mostrar o feedback
            });
        });
    } else {
        // Adiciona evento para o botão de fundamentação
        const fundBtn = questionElement.querySelector('.fundamentacao-btn');
        const fundBox = questionElement.querySelector('.fundamentacao');
        if (fundBtn) {
            fundBtn.addEventListener('click', () => {
                fundBox.classList.toggle('show');
            });
        }
    }

    updateNavigationButtons();
}

// ... (Restante das funções auxiliares como updateNavigationButtons, updateProgress, etc.) ...
// (O código abaixo é praticamente o mesmo que você já tinha, adaptado)

function updateNavigationButtons() {
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex >= allQuestions.length - 1;
    goToQuestionInput.max = allQuestions.length;
    goToQuestionInput.min = 1;
}

function updateProgress() {
    currentQuestionSpan.textContent = currentQuestionIndex + 1;
}

function setupQuestionNavigation() {
    const validateAndNavigate = (value) => {
        const questionNum = parseInt(value, 10);
        if (!isNaN(questionNum) && questionNum >= 1 && questionNum <= allQuestions.length) {
            currentQuestionIndex = questionNum - 1;
            renderCurrentQuestion();
            goToQuestionInput.value = '';
            goToQuestionInput.placeholder = 'Ir para questão';
        } else {
            goToQuestionInput.classList.add('error');
            goToQuestionInput.value = '';
            goToQuestionInput.placeholder = `Inválido (1 a ${allQuestions.length})`;
            setTimeout(() => {
                goToQuestionInput.classList.remove('error');
                goToQuestionInput.placeholder = 'Ir para questão';
            }, 2000);
        }
    };

    goToQuestionInput.addEventListener('change', (e) => validateAndNavigate(e.target.value));
    goToQuestionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') validateAndNavigate(e.target.value);
    });
}

// =================================================================
// EVENT LISTENERS (OS "OUVIDOS" DO APP)
// =================================================================

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
