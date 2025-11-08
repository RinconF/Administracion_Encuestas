(() => {
    const STORAGE_KEY = 'encuestas_admin_local_v1';
    const SESSION_KEY = 'encuestas_sesion_usuario';

    const VALIDATION_RULES = {
        libre: {
            label: 'Texto libre',
            hint: 'Acepta cualquier respuesta corta sin restricciones adicionales.',
            example: 'Ej. Comentario breve',
            validate: () => true
        },
        cedula: {
            label: 'Número de cédula',
            hint: 'Solo números con 8 a 10 dígitos consecutivos.',
            example: 'Ej. 0912345678',
            validate: value => /^\d{8,10}$/.test(value.trim())
        },
        telefono: {
            label: 'Teléfono',
            hint: 'Números nacionales o internacionales (10 a 15 dígitos) con prefijo opcional +.',
            example: 'Ej. +593991234567',
            validate: value => /^\+?\d{10,15}$/.test(value.trim())
        },
        fecha: {
            label: 'Fecha (AAAA-MM-DD)',
            hint: 'Usa el formato ISO 8601 y valida que la fecha exista.',
            example: 'Ej. 2024-05-30',
            validate: value => {
                const trimmed = value.trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                    return false;
                }
                const date = new Date(trimmed);
                const [year, month, day] = trimmed.split('-').map(Number);
                return (
                    date.getUTCFullYear() === year &&
                    date.getUTCMonth() + 1 === month &&
                    date.getUTCDate() === day
                );
            }
        },
        correo: {
            label: 'Correo electrónico',
            hint: 'Verifica que exista usuario, arroba y dominio válido.',
            example: 'Ej. nombre@empresa.com',
            validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase())
        }
    };

    const DEMO_USERS = [
        {
            id: 'usuario-demo-1',
            nombre: 'María Rivera',
            correo: 'maria.rivera@empresa.com',
            password: '123456',
            encuestaAsignada: null
        },
        {
            id: 'usuario-demo-2',
            nombre: 'Carlos Herrera',
            correo: 'carlos.herrera@empresa.com',
            password: '123456',
            encuestaAsignada: null
        }
    ];

    const state = {
        surveys: [],
        editingSurveyId: null,
        questionCounter: 0,
        currentUser: null
    };

    const elements = {};

    document.addEventListener('DOMContentLoaded', () => {
        cacheElements();
        registerListeners();
        loadSurveys();
        populateValidationsList();
        updateStorageStatus();
        renderSurveys();
        restoreSession();
        updateUserInterface();
        applyInitialViewFromQuery();
    });

    function cacheElements() {
        elements.headerSubtitle = document.getElementById('headerSubtitle');
        elements.adminView = document.getElementById('adminView');
        elements.userView = document.getElementById('userView');
        elements.toggleButtons = document.querySelectorAll('.toggle-btn');
        elements.tabs = document.querySelectorAll('.tab');
        elements.tabContents = document.querySelectorAll('.tab-content');
        elements.surveysList = document.getElementById('surveysList');
        elements.surveysCount = document.getElementById('surveysCount');
        elements.statsContent = document.getElementById('statsContent');
        elements.storageStatus = document.getElementById('storageStatus');
        elements.validationsList = document.getElementById('validationsList');
        elements.modal = document.getElementById('surveyModal');
        elements.modalTitle = document.getElementById('modalTitle');
        elements.surveyForm = document.getElementById('surveyForm');
        elements.questionsList = document.getElementById('questionsList');
        elements.loginForm = document.getElementById('loginForm');
        elements.loginError = document.getElementById('loginError');
        elements.userLoginCard = document.getElementById('userLoginCard');
        elements.userDashboard = document.getElementById('userDashboard');
        elements.userName = document.getElementById('userName');
        elements.userPendingInfo = document.getElementById('userPendingInfo');
        elements.userSurveySection = document.getElementById('userSurveySection');
        elements.userSurveyTitle = document.getElementById('userSurveyTitle');
        elements.userSurveyIntro = document.getElementById('userSurveyIntro');
        elements.userSurveyContent = document.getElementById('userSurveyContent');
        elements.userSurveyFeedback = document.getElementById('userSurveyFeedback');
    }

    function registerListeners() {
        if (elements.surveyForm) {
            elements.surveyForm.addEventListener('submit', handleSurveySubmit);
        }

        if (elements.loginForm) {
            elements.loginForm.addEventListener('submit', handleLoginSubmit);
        }

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && elements.modal && !elements.modal.hasAttribute('hidden')) {
                closeModal();
            }
        });
    }

    function restoreSession() {
        try {
            const stored = sessionStorage.getItem(SESSION_KEY);
            if (!stored) return;
            const parsed = JSON.parse(stored);
            if (parsed?.correo) {
                state.currentUser = parsed;
                ensureUserAssignment(state.currentUser);
                switchView('user');
            }
        } catch (error) {
            console.warn('No se pudo restaurar la sesión del usuario.', error);
        }
    }

    function getDefaultData() {
        const now = new Date().toISOString();
        return [
            {
                id: generateId('encuesta'),
                titulo: 'Encuesta de satisfacción interna',
                tipo_encuesta: 'mixed',
                puntaje_minimo: 70,
                intentos_maximos: 2,
                tiempo_limite_minutos: 20,
                creado_en: now,
                actualizado_en: now,
                preguntas: [
                    {
                        id: generateId('pregunta'),
                        texto: '¿Cuál es tu correo de contacto?',
                        tipo: 'short_text',
                        puntos: null,
                        permitir_multiple: false,
                        validacion: 'correo',
                        opciones: []
                    },
                    {
                        id: generateId('pregunta'),
                        texto: 'Califica tu satisfacción general',
                        tipo: 'numeric_scale',
                        puntos: null,
                        permitir_multiple: false,
                        opciones: []
                    },
                    {
                        id: generateId('pregunta'),
                        texto: 'Selecciona los beneficios que más utilizas',
                        tipo: 'multiselect',
                        puntos: 10,
                        permitir_multiple: true,
                        opciones: [
                            { id: generateId('opcion'), texto: 'Seguro médico', es_correcta: false },
                            { id: generateId('opcion'), texto: 'Capacitaciones internas', es_correcta: false },
                            { id: generateId('opcion'), texto: 'Trabajo remoto', es_correcta: false },
                            { id: generateId('opcion'), texto: 'Otro(a): ¿Cuál?', es_correcta: false }
                        ]
                    }
                ],
                respuestas: []
            }
        ];
    }

    function loadSurveys() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            state.surveys = getDefaultData();
            persistSurveys();
            return;
        }

        try {
            const parsed = JSON.parse(stored);
            state.surveys = Array.isArray(parsed) ? parsed : getDefaultData();
        } catch (error) {
            console.warn('No se pudieron leer las encuestas guardadas. Se restaurará el ejemplo.', error);
            state.surveys = getDefaultData();
            persistSurveys();
        }

        updateSurveyCount();
    }

    function persistSurveys() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.surveys));
        updateSurveyCount();
        updateStorageStatus();
        ensureAssignmentsForAllUsers();
        if (state.currentUser) {
            ensureUserAssignment(state.currentUser);
            persistSession();
        }
    }

    function updateSurveyCount() {
        if (elements.surveysCount) {
            elements.surveysCount.textContent = state.surveys.length;
        }
    }

    function updateStorageStatus() {
        if (!elements.storageStatus) return;
        const raw = JSON.stringify(state.surveys);
        const sizeKb = raw ? new Blob([raw]).size / 1024 : 0;
        elements.storageStatus.textContent = `Encuestas guardadas: ${state.surveys.length}. Espacio utilizado: ${sizeKb.toFixed(2)} KB.`;
    }

    function populateValidationsList() {
        if (!elements.validationsList) return;
        elements.validationsList.innerHTML = Object.values(VALIDATION_RULES)
            .map(rule => `<li><strong>${rule.label}:</strong> ${rule.hint} <em>(${rule.example})</em></li>`)
            .join('');
    }

    function renderSurveys() {
        if (!elements.surveysList) return;

        if (state.surveys.length === 0) {
            elements.surveysList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>No hay encuestas creadas</p>
                    <button class="btn-primary" onclick="openCreateModal()" style="margin-top: 1rem;">
                        Crear primera encuesta
                    </button>
                </div>
            `;
            return;
        }

        elements.surveysList.innerHTML = state.surveys.map(survey => {
            const shortValidations = survey.preguntas.filter(q => q.tipo === 'short_text' && q.validacion);
            const updatedAt = formatDateTime(survey.actualizado_en);
            return `
                <div class="survey-card">
                    <div class="survey-card-header">
                        <div>
                            <div class="survey-title">${survey.titulo}</div>
                            <div class="survey-badges">
                                <span class="badge ${badgeByType(survey.tipo_encuesta)}">${formatType(survey.tipo_encuesta)}</span>
                                ${updatedAt ? `<span class="badge badge-blue">Actualizada ${updatedAt}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="survey-stats">
                        <div class="stat">
                            <div class="stat-label">Preguntas</div>
                            <div class="stat-value">${survey.preguntas.length}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Validaciones</div>
                            <div class="stat-value">${shortValidations.length}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Tiempo</div>
                            <div class="stat-value">${survey.tiempo_limite_minutos || '-'} min</div>
                        </div>
                    </div>
                    <div class="survey-actions">
                        <button class="btn-sm" onclick="viewStats('${survey.id}')">📊 Ver resumen</button>
                        <button class="btn-sm" onclick="editSurvey('${survey.id}')">✏️ Editar</button>
                        <button class="btn-sm" onclick="deleteSurvey('${survey.id}')">🗑️ Eliminar</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function formatDateTime(value) {
        if (!value) return '';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return '';
        return parsed.toLocaleString();
    }

    function badgeByType(type) {
        if (type === 'opinion') return 'badge-blue';
        if (type === 'quiz') return 'badge-green';
        return 'badge-orange';
    }

    function switchView(view, event) {
        event?.preventDefault();
        const showAdmin = view === 'admin';

        elements.adminView?.classList.toggle('active', showAdmin);
        elements.userView?.classList.toggle('active', !showAdmin);
        elements.headerSubtitle.textContent = showAdmin
            ? 'Panel de Administración'
            : 'Portal de colaboradores';

        elements.toggleButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
    }

    function switchTab(tabName, evt) {
        evt?.preventDefault();
        elements.tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
        elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });
    }

    function openCreateModal() {
        state.editingSurveyId = null;
        state.questionCounter = 0;
        elements.modalTitle.textContent = 'Nueva Encuesta';
        elements.surveyForm.reset();
        elements.questionsList.innerHTML = '';
        elements.modal.removeAttribute('hidden');
    }

    function closeModal() {
        elements.modal.setAttribute('hidden', '');
    }

    function editSurvey(id) {
        const survey = state.surveys.find(s => s.id === id);
        if (!survey) return;

        state.editingSurveyId = id;
        state.questionCounter = 0;
        elements.modalTitle.textContent = 'Editar Encuesta';
        elements.surveyForm.reset();
        elements.questionsList.innerHTML = '';

        document.getElementById('surveyTitle').value = survey.titulo;
        document.getElementById('surveyType').value = survey.tipo_encuesta;
        document.getElementById('minScore').value = survey.puntaje_minimo ?? '';
        document.getElementById('maxAttempts').value = survey.intentos_maximos ?? '';
        document.getElementById('timeLimit').value = survey.tiempo_limite_minutos ?? '';

        survey.preguntas.forEach(question => addQuestion(question));

        elements.modal.removeAttribute('hidden');
    }

    function handleSurveySubmit(event) {
        event.preventDefault();

        const surveyBase = {
            titulo: document.getElementById('surveyTitle').value.trim(),
            tipo_encuesta: document.getElementById('surveyType').value,
            puntaje_minimo: parseNumber(document.getElementById('minScore').value),
            intentos_maximos: parseNumber(document.getElementById('maxAttempts').value),
            tiempo_limite_minutos: parseNumber(document.getElementById('timeLimit').value),
            preguntas: collectQuestions()
        };

        if (!surveyBase.titulo || surveyBase.preguntas.length === 0) {
            alert('Debes agregar al menos una pregunta para guardar la encuesta.');
            return;
        }

        const now = new Date().toISOString();

        if (state.editingSurveyId) {
            state.surveys = state.surveys.map(survey => survey.id === state.editingSurveyId
                ? {
                    ...survey,
                    ...surveyBase,
                    actualizado_en: now
                }
                : survey
            );
        } else {
            state.surveys.push({
                id: generateId('encuesta'),
                creado_en: now,
                actualizado_en: now,
                respuestas: [],
                ...surveyBase
            });
        }

        persistSurveys();
        renderSurveys();
        closeModal();
    }

    function collectQuestions() {
        const questions = [];
        elements.questionsList.querySelectorAll('.question-item').forEach(item => {
            const textInput = item.querySelector('.question-text');
            const typeSelect = item.querySelector('.question-type');
            const pointsInput = item.querySelector('.question-points');
            const validationSelect = item.querySelector('.validation-select');

            const question = {
                id: item.dataset.questionId || generateId('pregunta'),
                texto: textInput?.value.trim() || '',
                tipo: typeSelect?.value || 'multiple_choice',
                puntos: parseNumber(pointsInput?.value),
                permitir_multiple: typeSelect?.value === 'multiselect',
                validacion: validationSelect?.value || null,
                opciones: []
            };

            if (['multiple_choice', 'multiselect'].includes(question.tipo)) {
                item.querySelectorAll('.option-item').forEach(optionDiv => {
                    const text = normalizarTextoOpcion(optionDiv.querySelector('.option-text')?.value || '');
                    question.opciones.push({
                        id: optionDiv.dataset.optionId || generateId('opcion'),
                        texto: text,
                        es_correcta: optionDiv.querySelector('.option-radio')?.checked ?? false
                    });
                });
            }

            questions.push(question);
        });
        return questions;
    }

    function parseNumber(value) {
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function addQuestion(existingQuestion = null) {
        const questionNumber = ++state.questionCounter;
        const questionId = existingQuestion?.id || generateId('pregunta');
        const selectedType = existingQuestion?.tipo || 'multiple_choice';
        const selectedValidation = existingQuestion?.validacion || 'libre';

        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.id = `question-${questionNumber}`;
        questionDiv.dataset.questionId = questionId;
        questionDiv.innerHTML = `
            <div class="question-header">
                <span class="question-number">Pregunta ${questionNumber}</span>
                <button type="button" class="btn-remove" onclick="removeQuestion(${questionNumber})">Eliminar</button>
            </div>
            <div class="form-group">
                <input type="text" class="form-input question-text" placeholder="¿Cuál es tu pregunta?" value="${existingQuestion ? escapeHtml(existingQuestion.texto) : ''}" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <select class="form-select question-type" onchange="handleQuestionTypeChange(${questionNumber})">
                        <option value="multiple_choice" ${selectedType === 'multiple_choice' ? 'selected' : ''}>Opción múltiple</option>
                        <option value="multiselect" ${selectedType === 'multiselect' ? 'selected' : ''}>Casillas múltiples</option>
                        <option value="short_text" ${selectedType === 'short_text' ? 'selected' : ''}>Respuesta corta</option>
                        <option value="numeric_scale" ${selectedType === 'numeric_scale' ? 'selected' : ''}>Escala numérica</option>
                    </select>
                </div>
                <div class="form-group">
                    <input type="number" class="form-input question-points" placeholder="Puntos" value="${existingQuestion?.puntos ?? ''}">
                </div>
            </div>
            <div class="form-group validation-group" id="validation-${questionNumber}" style="display: ${selectedType === 'short_text' ? 'block' : 'none'};">
                <label class="form-label">Validación para la respuesta</label>
                <select class="form-select validation-select" onchange="updateValidationHint(${questionNumber})">
                    ${Object.entries(VALIDATION_RULES).map(([key, rule]) => `
                        <option value="${key}" ${selectedValidation === key ? 'selected' : ''}>${rule.label}</option>
                    `).join('')}
                </select>
                <div class="validation-hint" id="validation-hint-${questionNumber}">${VALIDATION_RULES[selectedValidation].hint} <em>${VALIDATION_RULES[selectedValidation].example}</em></div>
            </div>
            <div class="options-container" id="options-${questionNumber}" style="display: ${['multiple_choice', 'multiselect'].includes(selectedType) ? 'flex' : 'none'};">
                <div class="form-label" style="margin-top: 0.5rem;">Opciones:</div>
                <div id="options-list-${questionNumber}"></div>
                <button type="button" class="btn-add" onclick="addOption(${questionNumber})" style="margin-top: 0.5rem;">+ Agregar opción</button>
            </div>
        `;

        elements.questionsList.appendChild(questionDiv);

        if (existingQuestion && ['multiple_choice', 'multiselect'].includes(existingQuestion.tipo)) {
            existingQuestion.opciones.forEach(option => addOption(questionNumber, option));
        }
    }

    function removeQuestion(questionNumber) {
        const target = document.getElementById(`question-${questionNumber}`);
        target?.remove();
    }

    function handleQuestionTypeChange(questionNumber) {
        const questionDiv = document.getElementById(`question-${questionNumber}`);
        if (!questionDiv) return;
        const typeSelect = questionDiv.querySelector('.question-type');
        const optionsContainer = document.getElementById(`options-${questionNumber}`);
        const validationGroup = document.getElementById(`validation-${questionNumber}`);

        const isChoice = ['multiple_choice', 'multiselect'].includes(typeSelect.value);
        if (optionsContainer) {
            optionsContainer.style.display = isChoice ? 'flex' : 'none';
        }

        if (validationGroup) {
            validationGroup.style.display = typeSelect.value === 'short_text' ? 'block' : 'none';
            if (typeSelect.value === 'short_text') {
                updateValidationHint(questionNumber);
            }
        }
    }

    function updateValidationHint(questionNumber) {
        const questionDiv = document.getElementById(`question-${questionNumber}`);
        if (!questionDiv) return;
        const select = questionDiv.querySelector('.validation-select');
        const hint = document.getElementById(`validation-hint-${questionNumber}`);
        if (!select || !hint) return;
        const rule = VALIDATION_RULES[select.value] || VALIDATION_RULES.libre;
        hint.innerHTML = `${rule.hint} <em>${rule.example}</em>`;
    }

    function addOption(questionNumber, existingOption = null) {
        const optionsList = document.getElementById(`options-list-${questionNumber}`);
        if (!optionsList) return;
        const optionId = existingOption?.id || generateId('opcion');
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-item';
        optionDiv.dataset.optionId = optionId;
        optionDiv.innerHTML = `
            <input type="checkbox" class="option-radio" ${existingOption?.es_correcta ? 'checked' : ''}>
            <input type="text" class="form-input option-text" placeholder="Opción" value="${existingOption ? escapeHtml(existingOption.texto) : ''}" onblur="this.value = normalizarTextoOpcion(this.value);">
            <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
        `;
        optionsList.appendChild(optionDiv);
    }

    function deleteSurvey(id) {
        if (!confirm('¿Estás seguro de eliminar esta encuesta?')) return;
        state.surveys = state.surveys.filter(survey => survey.id !== id);
        persistSurveys();
        renderSurveys();
        if (state.currentUser?.encuestaAsignada === id) {
            state.currentUser.encuestaAsignada = null;
            ensureUserAssignment(state.currentUser);
            updateUserInterface();
        }
        alert('Encuesta eliminada.');
    }

    function viewStats(id) {
        switchTab('stats');
        const survey = state.surveys.find(s => s.id === id);
        if (!survey) {
            elements.statsContent.innerHTML = '<div class="empty-state"><p>No se encontró la encuesta seleccionada.</p></div>';
            return;
        }

        const totalQuestions = survey.preguntas.length;
        const counts = survey.preguntas.reduce((acc, question) => {
            acc[question.tipo] = (acc[question.tipo] || 0) + 1;
            return acc;
        }, {});
        const shortQuestions = survey.preguntas.filter(q => q.tipo === 'short_text');

        const typeSummary = [
            ['multiple_choice', 'Opción múltiple'],
            ['multiselect', 'Casillas múltiples'],
            ['short_text', 'Respuesta corta'],
            ['numeric_scale', 'Escala numérica']
        ].map(([key, label]) => `
            <div class="bar-item">
                <div class="bar-label">${label}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${totalQuestions ? ((counts[key] || 0) / totalQuestions) * 100 : 0}%">
                        ${counts[key] || 0}
                    </div>
                </div>
            </div>
        `).join('');

        const validationsHTML = shortQuestions.length > 0
            ? shortQuestions.map((question, index) => {
                const rule = VALIDATION_RULES[question.validacion] || VALIDATION_RULES.libre;
                const inputId = `test-${survey.id}-${index}`;
                const resultId = `validation-result-${survey.id}-${index}`;
                return `
                    <div class="stat-card">
                        <div class="stat-card-icon icon-blue">📝</div>
                        <div class="stat-label">${question.texto}</div>
                        <div class="stat-value">${rule.label}</div>
                        <div class="validation-hint">${rule.hint} <em>${rule.example}</em></div>
                        <div class="checkbox-group" style="margin-top: 0.75rem;">
                            <input type="text" class="form-input" id="${inputId}" placeholder="Ingresa un valor de prueba">
                            <button type="button" class="btn-sm" onclick="testValidation('${survey.id}', ${index})">Probar</button>
                        </div>
                        <div class="validation-result" id="${resultId}">Ingresa un valor para comprobar la regla.</div>
                    </div>
                `;
            }).join('')
            : `
                <div class="empty-state" style="padding: 2rem 1rem;">
                    <div class="empty-state-icon" style="font-size: 2rem;">ℹ️</div>
                    <p>No hay preguntas de respuesta corta con validaciones configuradas.</p>
                </div>
            `;

        elements.statsContent.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">${survey.titulo}</h2>
                <p style="color: #6b7280;">Resumen local de la encuesta</p>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-card-icon icon-blue">📄</div>
                    <div class="stat-label">Total de preguntas</div>
                    <div class="stat-value">${totalQuestions}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon icon-green">🔐</div>
                    <div class="stat-label">Validaciones activas</div>
                    <div class="stat-value">${shortQuestions.filter(q => q.validacion).length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon icon-purple">🕒</div>
                    <div class="stat-label">Tiempo límite</div>
                    <div class="stat-value">${survey.tiempo_limite_minutos ? `${survey.tiempo_limite_minutos} min` : 'Sin límite'}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon icon-orange">📊</div>
                    <div class="stat-label">Tipo principal</div>
                    <div class="stat-value">${formatType(survey.tipo_encuesta)}</div>
                </div>
            </div>
            <div class="chart-section">
                <h3 class="chart-title">Distribución por tipo de pregunta</h3>
                <div class="bar-chart">${typeSummary}</div>
            </div>
            <div class="chart-section">
                <h3 class="chart-title">Validaciones configuradas</h3>
                ${validationsHTML}
            </div>
            <button class="btn-sm" onclick="switchTab('surveys');" style="margin-top: 1rem;">← Volver a encuestas</button>
        `;
    }

    function testValidation(surveyId, questionIndex) {
        const survey = state.surveys.find(s => s.id === surveyId);
        if (!survey) return;
        const question = survey.preguntas.filter(q => q.tipo === 'short_text')[questionIndex];
        if (!question) return;

        const input = document.getElementById(`test-${survey.id}-${questionIndex}`);
        const result = document.getElementById(`validation-result-${survey.id}-${questionIndex}`);
        if (!input || !result) return;

        const value = input.value;
        const rule = VALIDATION_RULES[question.validacion] || VALIDATION_RULES.libre;
        const isValid = rule.validate(value);
        result.textContent = isValid
            ? '✅ El valor cumple con la validación.'
            : '❌ El valor no cumple con la validación seleccionada.';
        result.classList.toggle('ok', isValid);
        result.classList.toggle('error', !isValid);
    }

    function exportData() {
        const blob = new Blob([JSON.stringify(state.surveys, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'encuestas-locales.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.addEventListener('change', event => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const parsed = JSON.parse(e.target?.result);
                    if (!Array.isArray(parsed)) {
                        throw new Error('El archivo no contiene un arreglo de encuestas');
                    }
                    state.surveys = parsed;
                    persistSurveys();
                    renderSurveys();
                    updateUserInterface();
                    alert('Datos importados correctamente.');
                } catch (error) {
                    alert('No se pudo importar el archivo: ' + error.message);
                }
            };
            reader.readAsText(file, 'utf-8');
        });
        input.click();
    }

    function resetData() {
        if (!confirm('¿Deseas restablecer los datos de ejemplo? Perderás los cambios actuales.')) return;
        state.surveys = getDefaultData();
        persistSurveys();
        renderSurveys();
        updateUserInterface();
        alert('Datos de ejemplo restaurados.');
    }

    function clearAllData() {
        if (!confirm('Esta acción eliminará todas las encuestas guardadas. ¿Continuar?')) return;
        state.surveys = [];
        localStorage.removeItem(STORAGE_KEY);
        updateSurveyCount();
        updateStorageStatus();
        renderSurveys();
        ensureAssignmentsForAllUsers();
        updateUserInterface();
        alert('Se eliminó toda la información almacenada.');
    }

    function handleLoginSubmit(event) {
        event.preventDefault();
        if (!elements.loginForm) return;

        const email = elements.loginForm.loginEmail.value.trim().toLowerCase();
        const password = elements.loginForm.loginPassword.value.trim();

        const user = findUserByCredentials(email, password);
        if (!user) {
            showLoginError('Credenciales incorrectas. Intenta nuevamente.');
            return;
        }

        state.currentUser = { ...user };
        ensureUserAssignment(state.currentUser);
        persistSession();
        updateUserInterface();
        switchView('user');
        elements.loginForm.reset();
        showLoginError('');
    }

    function logoutUser() {
        state.currentUser = null;
        sessionStorage.removeItem(SESSION_KEY);
        updateUserInterface();
        showLoginError('');
        switchView('admin');
    }

    function updateUserInterface() {
        if (!elements.userDashboard || !elements.userLoginCard) return;
        const hasUser = Boolean(state.currentUser);
        elements.userDashboard.hidden = !hasUser;
        elements.userLoginCard.hidden = hasUser;

        if (!hasUser) {
            elements.userSurveySection.hidden = true;
            return;
        }

        elements.userName.textContent = state.currentUser.nombre;
        const survey = findAssignedSurvey(state.currentUser.encuestaAsignada);
        if (!survey) {
            elements.userPendingInfo.textContent = 'No tienes encuestas pendientes. ¡Gracias por participar!';
            elements.userSurveySection.hidden = true;
            elements.userSurveyFeedback.textContent = '';
            return;
        }

        elements.userPendingInfo.textContent = 'Tienes una encuesta pendiente por completar.';
        elements.userSurveySection.hidden = false;
        elements.userSurveyTitle.textContent = survey.titulo;
        elements.userSurveyIntro.textContent = `Tipo de encuesta: ${formatType(survey.tipo_encuesta)}.`;
        elements.userSurveyContent.innerHTML = survey.preguntas.map((question, index) => {
            if (question.tipo === 'short_text') {
                const rule = VALIDATION_RULES[question.validacion] || VALIDATION_RULES.libre;
                return `
                    <div class="user-question">
                        <h3>${index + 1}. ${question.texto}</h3>
                        <p><strong>Respuesta corta.</strong> ${rule.hint} <em>(${rule.example})</em></p>
                    </div>
                `;
            }

            if (['multiple_choice', 'multiselect'].includes(question.tipo)) {
                const tipo = question.tipo === 'multiselect' ? 'Selecciona todas las opciones que apliquen.' : 'Selecciona una opción.';
                return `
                    <div class="user-question">
                        <h3>${index + 1}. ${question.texto}</h3>
                        <p>${tipo}</p>
                        <ul>${question.opciones.map(opt => `<li>${opt.texto}</li>`).join('')}</ul>
                    </div>
                `;
            }

            if (question.tipo === 'numeric_scale') {
                return `
                    <div class="user-question">
                        <h3>${index + 1}. ${question.texto}</h3>
                        <p>Calificación numérica del 1 al 10.</p>
                    </div>
                `;
            }

            return `
                <div class="user-question">
                    <h3>${index + 1}. ${question.texto}</h3>
                    <p>Pregunta informativa.</p>
                </div>
            `;
        }).join('');

        elements.userSurveyFeedback.textContent = 'Esta vista es demostrativa y no envía respuestas a ningún servidor.';
    }

    function applyInitialViewFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view');
        if (viewParam === 'user') {
            switchView('user');
        }
    }

    function showLoginError(message) {
        if (!elements.loginError) return;
        elements.loginError.textContent = message;
    }

    function findUserByCredentials(email, password) {
        return ensureAssignmentsForAllUsers().find(user => user.correo === email && user.password === password);
    }

    function ensureAssignmentsForAllUsers() {
        return DEMO_USERS.map(user => {
            ensureUserAssignment(user);
            return user;
        });
    }

    function ensureUserAssignment(user) {
        if (state.surveys.length === 0) {
            user.encuestaAsignada = null;
            return;
        }
        if (!user.encuestaAsignada || !findAssignedSurvey(user.encuestaAsignada)) {
            user.encuestaAsignada = state.surveys[0].id;
        }
    }

    function findAssignedSurvey(id) {
        return state.surveys.find(survey => survey.id === id) || null;
    }

    function persistSession() {
        if (!state.currentUser) return;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            id: state.currentUser.id,
            nombre: state.currentUser.nombre,
            correo: state.currentUser.correo,
            encuestaAsignada: state.currentUser.encuestaAsignada
        }));
    }

    function normalizarTextoOpcion(value) {
        const texto = (value || '').trim();
        if (!texto) {
            return '';
        }

        const variantesOtro = new Set(['otro', 'otra', 'otroa', 'otros', 'otras']);
        const sinAcentos = texto
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        const simplificado = sinAcentos.replace(/[\s¿?():]/g, '');

        if (variantesOtro.has(simplificado)) {
            return 'Otro(a): ¿Cuál?';
        }

        return texto;
    }

    function formatType(type) {
        const map = {
            opinion: 'Opinión',
            quiz: 'Evaluación',
            mixed: 'Mixta'
        };
        return map[type] || type;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function generateId(prefix = 'id') {
        const random = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        return `${prefix}-${random}`;
    }

    // Exponer funciones necesarias para los manejadores declarados en el HTML
    Object.assign(window, {
        switchView,
        switchTab,
        openCreateModal,
        closeModal,
        addQuestion,
        removeQuestion,
        handleQuestionTypeChange,
        updateValidationHint,
        addOption,
        editSurvey,
        deleteSurvey,
        viewStats,
        testValidation,
        exportData,
        importData,
        resetData,
        clearAllData,
        logoutUser,
        normalizarTextoOpcion
    });
})();
