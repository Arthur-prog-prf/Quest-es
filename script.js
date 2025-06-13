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
    const decreaseFontBtn = document.getElementById('decrease-font');
    const increaseFontBtn = document.getElementById('increase-font');
    const resetFontBtn = document.getElementById('reset-font');
    const exportPdfBtn = document.getElementById('export-pdf');
    const printBtn = document.getElementById('print');
    const themeToggleBtn = document.getElementById('theme-toggle');

    // Estado do app
    let currentQuiz = [];
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let fontSize = 16;

    // Carrega a lista de matérias
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

    // Carrega o arquivo de questões selecionado
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

    // Novo parser atualizado para o formato real do arquivo
    function parseQuizFile(text) {
        const lines = text.split('\n');
        currentQuiz = [];
        userAnswers = [];

        const gabarito = {};
        const fundamentacao = {};
        let currentQuestion = null;
        let mode = 'questoes';
        let lastFundKey = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            if (/^Gabarito:/i.test(line)) {
                mode = 'gabarito';
                continue;
            }

            if (/^Fundamentação:/i.test(line)) {
                mode = 'fundamentacao';
                continue;
            }

            if (mode === 'questoes') {
                const qMatch = line.match(/^Questão\s+(\d+)\s*-\s*(.+)/i);
                const optMatch = line.match(/^([a-d])\)\s+(.+)/i);
                if (qMatch) {
                    if (currentQuestion) currentQuiz.push(currentQuestion);
                    currentQuestion = {
                        number: qMatch[1],
                        text: qMatch[2].trim(),
                        options: []
                    };
                    userAnswers.push(null);
                } else if (optMatch && currentQuestion) {
                    currentQuestion.options.push({
                        letter: optMatch[1].toLowerCase(),
                        text: optMatch[2].trim(),
                        correct: false
                    });
                }
            }

            if (mode === 'gabarito') {
                const match = line.match(/^(\d+)\s*-\s*([a-d])/i);
                if (match) {
                    gabarito[match[1]] = match[2].toLowerCase();
                }
            }

            if (mode === 'fundamentacao') {
                const keyMatch = line.match(/^(\d+)\s*-\s*([a-d])\)/i);
                if (keyMatch) {
                    lastFundKey = `${keyMatch[1]}-${keyMatch[2].toLowerCase()}`;
                    fundamentacao[lastFundKey] = '';
                } else if (lastFundKey) {
                    fundamentacao[lastFundKey] += (fundamentacao[lastFundKey] ? '\n' : '') + line;
                }
            }
        }

        if (currentQuestion) currentQuiz.push(currentQuestion);

        currentQuiz.forEach(question => {
            const correctLetter = gabarito[question.number];
            if (!correctLetter) {
                console.warn(`⚠️ Sem gabarito para a questão ${question.number}`);
            }
            question.options.forEach(opt => {
                opt.correct = opt.letter === correctLetter;
            });
            const fundKey = `${question.number}-${correctLetter}`;
            if (!fundamentacao[fundKey]) {
                console.warn(`⚠️ Sem fundamentação para a questão ${question.number}, letra ${correctLetter}`);
            }
            question.explanation = fundamentacao[fundKey] || 'Fundamentação não disponível.';
        });

        startQuiz();
    }

    // Inicia a exibição do quiz
    function startQuiz() {
        currentQuestionIndex = 0;
        quizArea.classList.remove('hidden');
        totalQuestionsSpan.textContent = currentQuiz.length;
        renderQuestions();
    }

    // Renderiza a pergunta atual
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
                ${question.options.map((option, index) => `
                    <div class="option 
                        ${isAnswered && userOptionIndex === index ? 'selected' : ''}
                        ${isAnswered && option.correct ? 'correct' : ''}
                        ${isAnswered && userOptionIndex === index && !option.correct ? 'incorrect' : ''}"
                        data-option-index="${index}">
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

        if (!isAnswered) {
            const options = questionElement.querySelectorAll('.option');
            options.forEach(option => {
                option.addEventListener('click', () => {
                    const index = parseInt(option.dataset.optionIndex);
                    userAnswers[currentQuestionIndex] = index;
                    renderQuestions();
                });
            });
        } else {
            const fundBtn = questionElement.querySelector('.fundamentacao-btn');
            const fundBox = questionElement.querySelector('.fundamentacao');
            fundBtn.addEventListener('click', () => {
                fundBox.style.display = fundBox.style.display === 'block' ? 'none' : 'block';
            });
        }

        updateNavigationButtons();
    }

    function updateNavigationButtons() {
        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.disabled = currentQuestionIndex >= currentQuiz.length - 1;
    }

    function updateProgress() {
        currentQuestionSpan.textContent = currentQuestionIndex + 1;
    }

    // Controles
    startBtn.addEventListener('click', () => {
        const file = materiasSelect.value;
        if (file) {
            loadQuiz(file);
        } else {
            alert('Por favor, selecione uma matéria.');
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

    exportPdfBtn.addEventListener('click', exportToPdf);
    function exportToPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 20;
        doc.setFontSize(16);
        doc.text("Simulado Jurídico", 105, y, { align: 'center' });
        y += 10;
        doc.setFontSize(12);

        currentQuiz.forEach((q, i) => {
            const qText = doc.splitTextToSize(`Questão ${q.number} - ${q.text}`, 180);
            doc.text(qText, 15, y); y += qText.length * 7;

            q.options.forEach(opt => {
                const oText = doc.splitTextToSize(`${opt.letter.toUpperCase()}) ${opt.text}`, 170);
                doc.text(oText, 20, y); y += oText.length * 7;
            });

            const correct = q.options.find(o => o.correct)?.letter.toUpperCase();
            doc.text(`Resposta correta: ${correct}`, 15, y); y += 7;

            const fund = doc.splitTextToSize(q.explanation, 180);
            doc.text(fund, 15, y); y += fund.length * 7 + 10;

            if (y > 270 && i < currentQuiz.length - 1) {
                doc.addPage(); y = 20;
            }
        });

        doc.save("simulado-juridico.pdf");
    }

    printBtn.addEventListener('click', () => window.print());

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        themeToggleBtn.textContent = document.body.classList.contains('dark-mode') ? 'Modo Claro' : 'Modo Escuro';
    });

    loadMaterias();
});
