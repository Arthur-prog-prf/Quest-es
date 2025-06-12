document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const materiasSelect = document.getElementById('materias');
    const startBtn = document.getElementById('start-btn');
    const quizArea = document.getElementById('quiz-area');
    const questionsArea = document.getElementById('questions-area');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const currentQuestionSpan = document.getElementById('current-question');
    const totalQuestionsSpan = document.getElementById('total-questions');
    const quizTitleElement = document.getElementById('quiz-title');
    const quizDescElement = document.getElementById('quiz-description');
    const decreaseFontBtn = document.getElementById('decrease-font');
    const increaseFontBtn = document.getElementById('increase-font');
    const resetFontBtn = document.getElementById('reset-font');
    const exportPdfBtn = document.getElementById('export-pdf');
    const printBtn = document.getElementById('print');
    const themeToggleBtn = document.getElementById('theme-toggle');

    // Variáveis de estado
    let currentQuiz = [];
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let fontSize = 16;
    let quizTitle = '';
    let quizDescription = '';

    async function loadMaterias() {
        try {
            const response = await fetch('materias/materias.json');
            if (!response.ok) throw new Error('Erro ao carregar materias.json');

            const materias = await response.json();

            const defaultOption = document.createElement('option');
            defaultOption.textContent = '-- Selecione --';
            defaultOption.value = '';
            materiasSelect.appendChild(defaultOption);

            materias.forEach(materia => {
                const option = document.createElement('option');
                option.value = materia.arquivo;
                option.textContent = materia.nome;
                materiasSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar lista de matérias:', error);
            alert('Erro ao carregar lista de matérias.');
        }
    }


    // Carrega o quiz selecionado
    async function loadQuiz(file) {
        try {
            const response = await fetch(`materias/${file}`);
            if (!response.ok) throw new Error('Arquivo não encontrado');
            
            const text = await response.text();
            parseQuizFile(text);
        } catch (error) {
            console.error('Erro ao carregar quiz:', error);
            alert('Erro ao carregar o quiz. Verifique o console para detalhes.');
        }
    }

    // Interpreta o arquivo .txt
    function parseQuizFile(text) {
        const lines = text.split('\n');
        currentQuiz = [];
        userAnswers = [];
        let currentQuestion = null;
        let inGabarito = false;
        let inFundamentacao = false;
        const gabarito = {};
        const fundamentacao = {};

        for (const line of lines) {
            if (line.trim() === '') continue;

            // Seção do gabarito
            if (line.toLowerCase().includes('gabarito:')) {
                inGabarito = true;
                inFundamentacao = false;
                continue;
            }

            // Seção de fundamentação
            if (line.toLowerCase().includes('fundamentação:')) {
                inGabarito = false;
                inFundamentacao = true;
                continue;
            }

            if (inGabarito) {
                // Processa gabarito (formato "1 - b")
                const match = line.match(/(\d+)\s*-\s*([a-d])/i);
                if (match) {
                    gabarito[match[1]] = match[2].toLowerCase();
                }
            } 
            else if (inFundamentacao) {
                // Aceita formatos como "1 - a):", "1 - a)", "1 - a) " ou similares
                const match = line.match(/(\d+)\s*-\s*([a-d]\))\s*:?\s*(.*)/i);
                if (match) {
                    const questaoNum = match[1];
                    const fundKey = `${questaoNum}-${match[2].toLowerCase().charAt(0)}`;
                    fundamentacao[fundKey] = match[3].trim(); // Pega o texto após o padrão
                }
            }
            else {
                // Processa questões (formato "Questão 1 - ...")
                const questaoMatch = line.match(/Questão\s+(\d+)\s*-\s*(.+)/i);
                if (questaoMatch) {
                    if (currentQuestion) {
                        currentQuiz.push(currentQuestion);
                    }
                    currentQuestion = {
                        number: questaoMatch[1],
                        text: questaoMatch[2].trim(),
                        options: []
                    };
                    userAnswers.push(null);
                } 
                // Processa alternativas (formato "a) texto")
                else if (line.match(/^[a-d]\)\s/i) && currentQuestion) {
                    const optionLetter = line[0].toLowerCase();
                    currentQuestion.options.push({
                        letter: optionLetter,
                        text: line.substring(2).trim(),
                        correct: false // Será definido pelo gabarito
                    });
                }
            }
        }

        if (currentQuestion) {
            currentQuiz.push(currentQuestion);
        }

        // Aplica o gabarito e fundamentação
        currentQuiz.forEach(question => {
            const correctLetter = gabarito[question.number];
            question.options.forEach(option => {
                option.correct = (option.letter === correctLetter);
            });
            
            // Adiciona fundamentação
            question.explanation = fundamentacao[`${question.number}-${correctLetter}`] || 
                                 "Fundamentação não disponível.";
        });

        startQuiz();
    }

    // Inicia o quiz
    function startQuiz() {
        currentQuestionIndex = 0;
        quizArea.classList.remove('hidden');
        totalQuestionsSpan.textContent = currentQuiz.length;
        renderQuestions();
    }

    function renderQuestions() {
    questionsArea.innerHTML = '';
    updateProgress();

    const question = currentQuiz[currentQuestionIndex];
    const isAnswered = userAnswers[currentQuestionIndex] !== null;
    const userOptionIndex = userAnswers[currentQuestionIndex];
    const userOption = question.options[userOptionIndex];

    const questionElement = document.createElement('div');
    questionElement.className = 'question-container';

    questionElement.innerHTML = `
        <div class="question">Questão ${question.number} - ${question.text}</div>
        <div class="options">
            ${question.options.map((option, optionIndex) => `
                <div class="option 
                    ${isAnswered && userOptionIndex === optionIndex ? 'selected' : ''}
                    ${isAnswered && option.correct ? 'correct' : ''}
                    ${isAnswered && userOptionIndex === optionIndex && !option.correct ? 'incorrect' : ''}"
                    data-option-index="${optionIndex}">
                    <span class="option-letter">${option.letter.toUpperCase()})</span> ${option.text}
                </div>
            `).join('')}
        </div>
        ${isAnswered ? `
            <div class="feedback ${userOption.correct ? 'correct-feedback' : 'incorrect-feedback'}">
                ${userOption.correct ? '✓ Resposta Correta!' : '✗ Resposta Incorreta!'}
            </div>
            <button class="fundamentacao-btn">Ver Fundamentação</button>
            <div class="fundamentacao" style="display:none;">
                ${question.explanation}
            </div>
        ` : ''}
    `;

    questionsArea.appendChild(questionElement);

    // Event listeners para opções
    if (!isAnswered) {
        const options = questionElement.querySelectorAll('.option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                const optionIndex = parseInt(option.dataset.optionIndex);
                userAnswers[currentQuestionIndex] = optionIndex;
                renderQuestions();
            });
        });
    } else {
        // Event listener para botão de fundamentação
        const fundamentacaoBtn = questionElement.querySelector('.fundamentacao-btn');
        const fundamentacao = questionElement.querySelector('.fundamentacao');

        fundamentacaoBtn.addEventListener('click', () => {
            fundamentacao.style.display = fundamentacao.style.display === 'block' ? 'none' : 'block';
        });
    }

    updateNavigationButtons();
}

    // Atualiza navegação
    function updateNavigationButtons() {
        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.disabled = currentQuestionIndex >= currentQuiz.length - 1;
    }

    function updateProgress() {
        currentQuestionSpan.textContent = currentQuestionIndex + 1;
    }

    // Event listeners
    startBtn.addEventListener('click', () => {
        const selectedFile = materiasSelect.value;
        if (selectedFile) {
            loadQuiz(selectedFile);
        } else {
            alert('Por favor, selecione uma matéria');
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderQuestions();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < currentQuiz.length - 1) {
            currentQuestionIndex++;
            renderQuestions();
        }
    });

    // Controles de fonte
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

    resetFontBtn.addEventListener('click', () => {
        fontSize = 16;
        document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
    });

    // Exportar PDF
    exportPdfBtn.addEventListener('click', exportToPdf);
    
    function exportToPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let y = 20;
        doc.setFontSize(16);
        doc.text(quizTitle || "Simulado Jurídico", 105, y, { align: 'center' });
        y += 10;
        
        doc.setFontSize(12);
        currentQuiz.forEach((question, index) => {
            const splitQuestion = doc.splitTextToSize(`Questão ${question.number} - ${question.text}`, 180);
            const splitOptions = question.options.map(opt => 
                doc.splitTextToSize(`${opt.letter.toUpperCase()}) ${opt.text}`, 180));
            
            doc.text(splitQuestion, 15, y);
            y += splitQuestion.length * 7;
            
            splitOptions.forEach(opt => {
                doc.text(opt, 20, y);
                y += opt.length * 7;
            });
            
            const correctAnswer = question.options.find(o => o.correct).letter.toUpperCase();
            doc.text(`Resposta correta: ${correctAnswer}`, 15, y);
            y += 7;
            
            const splitExplanation = doc.splitTextToSize(question.explanation, 180);
            doc.text(splitExplanation, 15, y);
            y += splitExplanation.length * 7 + 10;
            
            if (y > 270 && index < currentQuiz.length - 1) {
                doc.addPage();
                y = 20;
            }
        });
        
        doc.save("simulado-juridico.pdf");
    }

    // Imprimir
    printBtn.addEventListener('click', () => window.print());

    // Tema escuro/claro
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        themeToggleBtn.textContent = document.body.classList.contains('dark-mode') ? 'Modo Claro' : 'Modo Escuro';
    }

    // Inicialização
    loadMaterias();
});
