        const STORAGE_KEY = 'encuestas_admin_local_v1';

        const VALIDATION_RULES = {
            libre: {
                label: 'Texto libre',
                hint: 'Acepta cualquier respuesta corta sin restricciones adicionales.',
                example: 'Ej. Comentario breve',
                validate: () => true
            },
            cedula: {
                label: 'Número de cédula',
                hint: 'Obliga a ingresar solo números con 8 a 10 dígitos consecutivos (puedes ajustar la longitud según tu país).',
                example: 'Ej. 0912345678',
                validate: (value) => /^\d{8,10}$/.test(value.trim())
            },
            telefono: {
                label: 'Teléfono',
                hint: 'Admite números nacionales o internacionales (10 a 15 dígitos) con prefijo opcional +.',
                example: 'Ej. +593991234567',
                validate: (value) => /^\+?\d{10,15}$/.test(value.trim())
            },
            fecha: {
                label: 'Fecha (AAAA-MM-DD)',
                hint: 'Requiere el formato ISO 8601 y valida que la fecha exista en el calendario.',
                example: 'Ej. 2024-05-30',
                validate: (value) => {
                    const trimmed = value.trim();
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                        return false;
                    }
                    const date = new Date(trimmed);
                    const [year, month, day] = trimmed.split('-').map(Number);
                    return date.getUTCFullYear() === year && (date.getUTCMonth() + 1) === month && date.getUTCDate() === day;
                }
            },
            correo: {
                label: 'Correo electrónico',
                hint: 'Verifica que exista un usuario, una arroba y un dominio con extensión válida.',
                example: 'Ej. nombre@empresa.com',
                validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase())
            }
        };

        let surveys = [];
        let users = [];
        let currentUserId = null;
        let editingSurveyId = null;
        let questionCounter = 0;

        function generateId(prefix = 'id') {
            const random = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
            return `${prefix}-${random}`;
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

        function init() {
            loadSurveys();
            renderSurveys();
            populateValidationsList();
            updateStorageStatus();
        }

        function loadSurveys() {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                surveys = getDefaultData();
                persistSurveys();
                return;
            }

            try {
                const parsed = JSON.parse(stored);
                surveys = Array.isArray(parsed) ? parsed : getDefaultData();
            } catch (error) {
                console.warn('No se pudieron leer las encuestas guardadas. Se restaurará el ejemplo.', error);
                surveys = getDefaultData();
                persistSurveys();
            }

            updateSurveyCount();
        }

        function persistSurveys() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
            updateSurveyCount();
            updateStorageStatus();
        }

        function updateSurveyCount() {
            document.getElementById('surveysCount').textContent = surveys.length;
        }

        function updateStorageStatus() {
            const status = document.getElementById('storageStatus');
            if (!status) return;

            const raw = JSON.stringify(surveys);
            const sizeKb = raw ? (new Blob([raw]).size / 1024) : 0;
            status.textContent = `Encuestas guardadas: ${surveys.length}. Espacio utilizado: ${sizeKb.toFixed(2)} KB.`;
        }

        function populateValidationsList() {
            const list = document.getElementById('validationsList');
            if (!list) return;
            list.innerHTML = Object.entries(VALIDATION_RULES).map(([key, rule]) => `
                <li><strong>${rule.label}:</strong> ${rule.hint} <em>(${rule.example})</em></li>
            `).join('');
        }

        function renderSurveys() {
            const container = document.getElementById('surveysList');

            if (surveys.length === 0) {
                container.innerHTML = `
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

            container.innerHTML = surveys.map(survey => {
                const shortTextValidations = survey.preguntas.filter(q => q.tipo === 'short_text' && q.validacion);
                let updatedAt = '';
                if (survey.actualizado_en) {
                    const parsedDate = new Date(survey.actualizado_en);
                    if (!Number.isNaN(parsedDate.getTime())) {
                        updatedAt = parsedDate.toLocaleString();
                    }
                }

                return `
                    <div class="survey-card">
                        <div class="survey-card-header">
                            <div>
                                <div class="survey-title">${survey.titulo}</div>
                                <div class="survey-badges">
                                    <span class="badge ${
                                        survey.tipo_encuesta === 'opinion' ? 'badge-blue' :
                                        survey.tipo_encuesta === 'quiz' ? 'badge-green' : 'badge-orange'
                                    }">${formatType(survey.tipo_encuesta)}</span>
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
                                <div class="stat-value">${shortTextValidations.length}</div>
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

        function switchTab(tabName, evt = null) {
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => tab.classList.remove('active'));

            const targetTab = evt?.currentTarget || document.querySelector(`.tab[data-tab="${tabName}"]`);
            if (targetTab) {
                targetTab.classList.add('active');
            }

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === `${tabName}Tab`);
            });
        }

        function openCreateModal() {
            editingSurveyId = null;
            document.getElementById('modalTitle').textContent = 'Nueva Encuesta';
            document.getElementById('surveyForm').reset();
            document.getElementById('questionsList').innerHTML = '';
            questionCounter = 0;
            document.getElementById('surveyModal').classList.add('active');
        }

        function editSurvey(id) {
            const survey = surveys.find(s => s.id === id);
            if (!survey) return;

            editingSurveyId = id;
            document.getElementById('modalTitle').textContent = 'Editar Encuesta';
            document.getElementById('surveyTitle').value = survey.titulo;
            document.getElementById('surveyType').value = survey.tipo_encuesta;
            document.getElementById('minScore').value = survey.puntaje_minimo || '';
            document.getElementById('maxAttempts').value = survey.intentos_maximos || '';
            document.getElementById('timeLimit').value = survey.tiempo_limite_minutos || '';

            const questionsList = document.getElementById('questionsList');
            questionsList.innerHTML = '';
            questionCounter = 0;
            survey.preguntas.forEach(q => {
                addQuestion(q);
            });

            document.getElementById('surveyModal').classList.add('active');
        }

        function closeModal() {
            document.getElementById('surveyModal').classList.remove('active');
        }

        function addQuestion(existingQuestion = null) {
            const qNum = ++questionCounter;
            const questionDiv = document.createElement('div');
            const questionId = existingQuestion?.id || generateId('pregunta');
            questionDiv.className = 'question-item';
            questionDiv.id = `question-${qNum}`;
            questionDiv.dataset.questionId = questionId;

            const selectedType = existingQuestion?.tipo || 'multiple_choice';
            const selectedValidation = existingQuestion?.validacion || 'libre';

            questionDiv.innerHTML = `
                <div class="question-header">
                    <span class="question-number">Pregunta ${qNum}</span>
                    <button type="button" class="btn-remove" onclick="removeQuestion(${qNum})">Eliminar</button>
                </div>
                <div class="form-group">
                    <input type="text" class="form-input" placeholder="¿Cuál es tu pregunta?"
                           value="${existingQuestion ? existingQuestion.texto : ''}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <select class="form-select question-type" onchange="handleQuestionTypeChange(${qNum})">
                            <option value="multiple_choice" ${selectedType === 'multiple_choice' ? 'selected' : ''}>Opción múltiple</option>
                            <option value="multiselect" ${selectedType === 'multiselect' ? 'selected' : ''}>Casillas múltiples</option>
                            <option value="short_text" ${selectedType === 'short_text' ? 'selected' : ''}>Respuesta corta</option>
                            <option value="numeric_scale" ${selectedType === 'numeric_scale' ? 'selected' : ''}>Escala numérica</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <input type="number" class="form-input" placeholder="Puntos"
                               value="${existingQuestion?.puntos ?? ''}">
                    </div>
                </div>
                <div class="form-group" id="validation-${qNum}" style="display: ${selectedType === 'short_text' ? 'block' : 'none'};">
                    <label class="form-label">Validación para la respuesta</label>
                    <select class="form-select validation-select" onchange="updateValidationHint(${qNum})">
                        ${Object.entries(VALIDATION_RULES).map(([key, rule]) => `
                            <option value="${key}" ${selectedValidation === key ? 'selected' : ''}>${rule.label}</option>
                        `).join('')}
                    </select>
                    <div class="validation-hint" id="validation-hint-${qNum}">${VALIDATION_RULES[selectedValidation].hint} <em>${VALIDATION_RULES[selectedValidation].example}</em></div>
                </div>
                <div class="options-container" id="options-${qNum}" style="display: ${['multiple_choice', 'multiselect'].includes(selectedType) ? 'block' : 'none'}">
                    <div class="form-label" style="margin-top: 0.5rem;">Opciones:</div>
                    <div id="options-list-${qNum}"></div>
                    <button type="button" class="btn-add" onclick="addOption(${qNum})" style="margin-top: 0.5rem;">+ Agregar opción</button>
                </div>
            `;

            document.getElementById('questionsList').appendChild(questionDiv);

            if (existingQuestion && (existingQuestion.tipo === 'multiple_choice' || existingQuestion.tipo === 'multiselect')) {
                existingQuestion.opciones.forEach(opt => {
                    addOption(qNum, opt);
                });
            }
        }

        function removeQuestion(qNum) {
            document.getElementById(`question-${qNum}`)?.remove();
        }

        function handleQuestionTypeChange(qNum) {
            const select = document.querySelector(`#question-${qNum} .question-type`);
            const optionsDiv = document.getElementById(`options-${qNum}`);
            const validationGroup = document.getElementById(`validation-${qNum}`);
            const isChoice = ['multiple_choice', 'multiselect'].includes(select.value);

            if (optionsDiv) {
                optionsDiv.style.display = isChoice ? 'block' : 'none';
            }

            if (validationGroup) {
                validationGroup.style.display = select.value === 'short_text' ? 'block' : 'none';
                if (select.value === 'short_text') {
                    updateValidationHint(qNum);
                }
            }
        }

        function updateValidationHint(qNum) {
            const validationSelect = document.querySelector(`#question-${qNum} .validation-select`);
            const hint = document.getElementById(`validation-hint-${qNum}`);
            if (!validationSelect || !hint) return;

            const rule = VALIDATION_RULES[validationSelect.value] || VALIDATION_RULES.libre;
            hint.innerHTML = `${rule.hint} <em>${rule.example}</em>`;
        }

        const VARIANTES_OTRO = new Set(['otro', 'otra', 'otroa', 'otros', 'otras']);

        function normalizarTextoOpcion(valor) {
            const texto = (valor || '').trim();
            if (!texto) {
                return '';
            }

            const sinAcentos = texto
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
            const simplificado = sinAcentos.replace(/[\s¿?():]/g, '');

            if (VARIANTES_OTRO.has(simplificado)) {
                return 'Otro(a): ¿Cuál?';
            }

            return texto;
        }

        function addOption(qNum, existingOption = null) {
            const optionsList = document.getElementById(`options-list-${qNum}`);
            if (!optionsList) return;

            const optNum = optionsList.children.length + 1;
            const optionId = existingOption?.id || generateId('opcion');

            const optionDiv = document.createElement('div');
            optionDiv.className = 'option-item';
            optionDiv.dataset.optionId = optionId;
            optionDiv.innerHTML = `
                <input type="checkbox" class="option-radio" ${existingOption?.es_correcta ? 'checked' : ''}>
                <input type="text" class="form-input" placeholder="Opción ${optNum}"
                       value="${existingOption ? existingOption.texto : ''}" style="flex: 1;"
                       onblur="this.value = normalizarTextoOpcion(this.value);">
                <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
            `;

            optionsList.appendChild(optionDiv);
        }

        document.getElementById('surveyForm').addEventListener('submit', (e) => {
            e.preventDefault();

            const baseSurvey = {
                titulo: document.getElementById('surveyTitle').value,
                tipo_encuesta: document.getElementById('surveyType').value,
                puntaje_minimo: parseInt(document.getElementById('minScore').value) || null,
                intentos_maximos: parseInt(document.getElementById('maxAttempts').value) || null,
                tiempo_limite_minutos: parseInt(document.getElementById('timeLimit').value) || null,
                preguntas: []
            };

            document.querySelectorAll('.question-item').forEach(qDiv => {
                const textoPregunta = qDiv.querySelector('.form-input')?.value || '';
                const tipoSelect = qDiv.querySelector('.question-type');
                const puntosInput = qDiv.querySelector('input[type="number"]');
                const validationSelect = qDiv.querySelector('.validation-select');

                const question = {
                    id: qDiv.dataset.questionId || generateId('pregunta'),
                    texto: textoPregunta,
                    tipo: tipoSelect?.value || 'multiple_choice',
                    puntos: puntosInput?.value ? parseInt(puntosInput.value) : null,
                    permitir_multiple: tipoSelect?.value === 'multiselect',
                    validacion: validationSelect?.value || null,
                    opciones: []
                };

                if (['multiple_choice', 'multiselect'].includes(question.tipo)) {
                    qDiv.querySelectorAll('.option-item').forEach(optDiv => {
                        const texto = normalizarTextoOpcion(optDiv.querySelector('input[type="text"]').value);
                        question.opciones.push({
                            id: optDiv.dataset.optionId || generateId('opcion'),
                            texto,
                            es_correcta: optDiv.querySelector('input[type="checkbox"]').checked
                        });
                    });
                }

                if (question.tipo !== 'short_text') {
                    question.validacion = null;
                }

                baseSurvey.preguntas.push(question);
            });

            const timestamp = new Date().toISOString();

            if (editingSurveyId) {
                surveys = surveys.map(survey => {
                    if (survey.id !== editingSurveyId) return survey;
                    return {
                        ...survey,
                        ...baseSurvey,
                        id: editingSurveyId,
                        creado_en: survey.creado_en || timestamp,
                        actualizado_en: timestamp
                    };
                });
                alert('Encuesta actualizada correctamente.');
            } else {
                surveys.push({
                    id: generateId('encuesta'),
                    creado_en: timestamp,
                    actualizado_en: timestamp,
                    respuestas: [],
                    ...baseSurvey
                });
                alert('Encuesta creada correctamente.');
            }

            persistSurveys();
            renderSurveys();
            closeModal();
        });

        function deleteSurvey(id) {
            if (!confirm('¿Estás seguro de eliminar esta encuesta?')) return;
            surveys = surveys.filter(s => s.id !== id);
            persistSurveys();
            renderSurveys();
            alert('Encuesta eliminada.');
        }

        function viewStats(id) {
            switchTab('stats');

            const survey = surveys.find(s => s.id === id);
            const statsContent = document.getElementById('statsContent');
            if (!survey) {
                statsContent.innerHTML = '<div class="empty-state"><p>No se encontró la encuesta seleccionada.</p></div>';
                return;
            }

            const totalPreguntas = survey.preguntas.length;
            const counts = survey.preguntas.reduce((acc, question) => {
                acc[question.tipo] = (acc[question.tipo] || 0) + 1;
                return acc;
            }, {});
            const shortTextQuestions = survey.preguntas.filter(q => q.tipo === 'short_text');

            const tipoResumen = [
                ['multiple_choice', 'Opción múltiple'],
                ['multiselect', 'Casillas múltiples'],
                ['short_text', 'Respuesta corta'],
                ['numeric_scale', 'Escala numérica']
            ].map(([key, label]) => `
                <div class="bar-item">
                    <div class="bar-label">${label}</div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${totalPreguntas ? (counts[key] || 0) / totalPreguntas * 100 : 0}%">
                            ${counts[key] || 0}
                        </div>
                    </div>
                </div>
            `).join('');

            const validacionesHTML = shortTextQuestions.length > 0
                ? shortTextQuestions.map((question, index) => {
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

            statsContent.innerHTML = `
                <div style="margin-bottom: 1.5rem;">
                    <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">${survey.titulo}</h2>
                    <p style="color: #6b7280;">Resumen local de la encuesta</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-card-icon icon-blue">📄</div>
                        <div class="stat-label">Total de preguntas</div>
                        <div class="stat-value">${totalPreguntas}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon icon-green">🔐</div>
                        <div class="stat-label">Validaciones activas</div>
                        <div class="stat-value">${shortTextQuestions.filter(q => q.validacion).length}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon icon-purple">🕒</div>
                        <div class="stat-label">Tiempo límite</div>
                        <div class="stat-value">${survey.tiempo_limite_minutos ? survey.tiempo_limite_minutos + ' min' : 'Sin límite'}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon icon-orange">📊</div>
                        <div class="stat-label">Tipo principal</div>
                        <div class="stat-value">${formatType(survey.tipo_encuesta)}</div>
                    </div>
                </div>

                <div class="chart-section">
                    <h3 class="chart-title">Distribución por tipo de pregunta</h3>
                    <div class="bar-chart">${tipoResumen}</div>
                </div>

                <div class="chart-section">
                    <h3 class="chart-title">Validaciones configuradas</h3>
                    ${validacionesHTML}
                </div>

                <button class="btn-sm" onclick="switchTab('surveys');" style="margin-top: 1rem;">
                    ← Volver a encuestas
                </button>
            `;
        }

        function testValidation(surveyId, questionIndex) {
            const survey = surveys.find(s => s.id === surveyId);
            if (!survey) return;

            const question = survey.preguntas.filter(q => q.tipo === 'short_text')[questionIndex];
            if (!question) return;

            const inputId = `test-${survey.id}-${questionIndex}`;
            const resultId = `validation-result-${survey.id}-${questionIndex}`;
            const input = document.getElementById(inputId);
            const result = document.getElementById(resultId);

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
            const blob = new Blob([JSON.stringify(surveys, null, 2)], { type: 'application/json' });
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
            input.addEventListener('change', (event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const parsed = JSON.parse(e.target?.result);
                        if (!Array.isArray(parsed)) {
                            throw new Error('El archivo no contiene un arreglo de encuestas');
                        }
                        surveys = parsed;
                        persistSurveys();
                        renderSurveys();
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
            surveys = getDefaultData();
            persistSurveys();
            renderSurveys();
            alert('Datos de ejemplo restaurados.');
        }

        function clearAllData() {
            if (!confirm('Esta acción eliminará todas las encuestas guardadas. ¿Continuar?')) return;
            surveys = [];
            localStorage.removeItem(STORAGE_KEY);
            updateSurveyCount();
            updateStorageStatus();
            renderSurveys();
            alert('Se eliminó toda la información almacenada.');
        }

        function formatType(type) {
            const types = {
                'opinion': 'Opinión',
                'quiz': 'Evaluación',
                'mixed': 'Mixta'
            };
            return types[type] || type;
        }

        init();