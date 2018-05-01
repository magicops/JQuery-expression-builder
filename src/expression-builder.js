window.expressionBuilder = function(selector, options) {
 
    if (!options)
        options = {};
 
    //up or dopwn
    if (!options.suggestions)
        options.suggestions = 'down';
 
    if (!options.expression)
        options.expression = '';
 
    let expressionInput = $(selector),
        lastText = '',
        inSearchMode = false,
        suggestions,
        notificaiton,
        isPaste = false;
 
    //Initial for the first time
    if (!expressionInput.attr('exp-id')) {
 
        let id = new Date().getTime();
        suggestions = $("<div class='exp-suggestions " + options.suggestions + "' exp-id='" + id + "'></div>");
        notificaiton = $("<div class='exp-notification' exp-id='" + id + "'><span class='glyphicon glyphicon-ok ok'></span><span class='glyphicon glyphicon-remove error'></span></div>");
 
        expressionInput.attr('exp-id', id);
 
        if (!options.variables)
            options.variables = [];
 
        //expressionsData.push({
        //    id: id,
        //    variables: options.variables
        //});
 
        expressionInput.data("variables", options.variables);
 
        let parent = $("<div class='exp-container' exp-id='" + id + "'></div>");
 
        expressionInput.parent().append(parent);
 
        parent
            .append(expressionInput)
            .append(suggestions)
            .append(notificaiton);
 
        //Key up: cannot prevent entering wrong chars by return false
        //key down: can prevent but doesn't have latest text in the text value
        expressionInput.on('input', onInput);
        //expressionInput.keypress(inputCharacter);
        expressionInput.keyup(onKeyup);
        expressionInput.on('paste', onPaste);
 
        suggestions.on('click', '.exp-suggestion-item', function (e) {
            selectVariable($(this));
            e.stopPropagation();
        });
 
        expressionInput.on('blur', validation);
        $('body').click(hideSuggestions);
        expressionInput.click(function (e) { e.stopPropagation(); });
 
        //set value
        if (options.expression != '')
            setExpresionToInput(options.expression);
    }
    else {
        let id = expressionInput.attr('exp-id');
        suggestions = $('.exp-container .exp-suggestions[exp-id=' + id + "]");
        notificaiton = $('.exp-container .exp-notification[exp-id=' + id + "]");
    }
 
    function onPaste(e) {
        isPaste = true;
        setTimeout(function () { isPaste = false; validation(); }, 100);
    }
 
    function onKeyup(e) {
 
        if (['Up', 'Down', 'ArrowUp', 'ArrowDown'].indexOf(e.key) > -1 && inSearchMode) {
            let index = parseInt(suggestions.attr('data-index')),
                divs = suggestions.find('div.exp-suggestion-item'),
                isUp = e.key == 'Up' || e.key == 'ArrowUp';
 
            if (isUp && index == 0 || !isUp && divs.size() == index + 1)
                return;
 
            if (isUp)
                index--;
 
            if (!isUp)
                index++;
 
            suggestions.attr('data-index', index);
            divs.removeClass('selected');
            $(divs.get(index)).addClass('selected');
 
            return;
        }
 
        if (e.key == "Enter" && inSearchMode) {
            selectVariable(suggestions.find('.exp-suggestion-item.selected'));
            return;
        }
 
        //Ignore
        if (['Left', 'Right', 'Up', 'Down', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Control', 'Shift', 'Alt', 'Esc', 'End', 'Home', "Enter"].indexOf(e.key) > -1)
            return;
 
    }
 
    function onInput(e) {
        let txt = expressionInput,
            val = txt.val(),
            cursor = $(this).get(0).selectionStart,
            lastChar = "",
            input = lastText.length > val.length ? '\b' : val[cursor - 1],
            hasSpace = false;
 
        if (isPaste) {
            lastText = val;
            return;
        }
 
        if (input == "\b")
            lastChar = lastText[cursor];
        else {
            let lastCharLocation = cursor - 2;
            lastChar = val[lastCharLocation] || "";
 
            hasSpace = lastChar == ' ';
 
            while (lastChar == ' ') {
                lastChar = val[--lastCharLocation] || "";
            }
        }
 
        //console.log({ input: input, cursor: cursor, lastChar: lastChar, hasSpace: hasSpace });
 
        if (isInvalidCharacter(input))
            return setLastText(cursor);
 
        //Prevent multiple spaces
        if (input == ' ' && hasSpace)
            return setLastText(cursor);
 
        if (isOperator(input)) {
            if (lastText == '' ||
                isOperator(lastChar) ||
                ['[', '('].indexOf(lastChar) > -1)
                return setLastText(cursor);
        }
 
        if (input == ")")
            if (isOperator(lastChar) || lastText == '' || lastChar == "[")
                return setLastText(cursor);
 
        if (input == "(" && lastText != '')
            if (!isOperator(lastChar) && lastChar != "(" && lastChar != '')
                return setLastText(cursor);
 
        if (input == "[") {
            if (lastText != '') {
                if ([']', '[', ')'].indexOf(lastChar) > -1)
                    return setLastText(cursor);
 
                if (!isOperator(lastChar) && lastChar != '(' && lastChar != '')
                    return setLastText(cursor);
            }
 
            inSearchMode = true;
            showSuggestions(val, cursor);
        }
 
        if (input == "]") {
            if (lastText == '' || isOperator(lastChar) || [']', '[', ')', '('].indexOf(lastChar) > -1)
                return setLastText(cursor);
 
            if (!inSearchMode)
                return setLastText(cursor);
 
            inSearchMode = false;
            hideSuggestions();
        }
 
        if (!inSearchMode && isVariableCharacter(input))
            return setLastText(cursor);
 
        if (input == '\b' && lastChar == '[') {
            inSearchMode = false;
            hideSuggestions();
        }
 
        if (input == '\b' && lastChar == ']') {
            inSearchMode = true;
            showSuggestions(val, cursor);
        }
 
        if (isNumber(input) && lastText != '') {
            if (isNumber(lastChar) && hasSpace)
                return setLastText(cursor);
 
            if (!inSearchMode && !isOperator(lastChar) && !isNumber(lastChar) && lastChar != '(' && lastChar != '')
                return setLastText(cursor);
        }
 
        if (inSearchMode && (isVariableCharacter(input) || isNumber(input) || input == '\b')) {
            showSuggestions(val, cursor);
        }
 
        lastText = val;
 
        validation();
    }
 
    function setExpresionToInput(expression) {
        let exp = parseExpression(expression);
 
        lastText = exp;
        expressionInput.val(exp);
        validation();
    }
 
    function parseExpression(expression) {
        let exp = '',
            inVariable = false,
            varId = '';
 
        for (var i = 0; i < expression.length; i++) {
            let input = expression[i];
 
            if (input == '[') {
                inVariable = true;
                varId = '';
                continue;
            }
 
            if (input == ']' && inVariable) {
                let varName = getVariableById(varId);
 
                if (varName)
                    exp += "[" + varName + "]";
                else
                    exp += "[var" + varId + "]";
 
                inVariable = false;
                continue;
            }
 
            if (inVariable) {
                varId += input;
                continue;
            }
 
            exp += input;
        }
 
        return exp;
    }
 
    function getVariableById(varId) {
 
        if (!options.variables)
            options.variables = expressionInput.data("variables");
 
        if (options.variables) {
            for (var i = 0; i < options.variables.length; i++)
                if (options.variables[i].id == varId)
                    return options.variables[i].name;
        }
 
        return undefined;
    }
 
    function getVariable(varName) {
 
        if (!options.variables)
            options.variables = expressionInput.data("variables");
 
        if (options.variables)
            for (var j = 0; j < options.variables.length; j++)
                if (options.variables[j].name == varName)
                    return options.variables[j];
 
        return undefined;
    }
 
    //validations
    function isOperator(char) {
        return ['-', '+', '*', '/'].indexOf(char) >= 0
    }
 
    function isInvalidCharacter(char) {
        return ['~', '!', '@', '#', '$', '%', '^', '&', '=', '{', '}', '<', '>', '|', '\\', '`'].indexOf(char) >= 0
    }
 
    function isVariableCharacter(char) {
        if (char == '_')
            return true;
 
        if (char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z')
            return true;
 
        return false;
    }
 
    function isNumber(char) {
        return char >= '0' && char <= '9';
    }
 
    function parseInput() {
        let text = expressionInput.val(),
            formula = '',
            expression = '',
            inVariable = false,
            varName = '',
            varNames = [];
 
        for (var i = 0; i < text.length; i++) {
            let input = text[i],
                lastInput = text[i - 1];
 
            if (isOperator(input) || ['(', ')'].indexOf(input) > -1) {
                formula += input;
                expression += input;
                continue;
            }
 
            if (input == '[') {
                inVariable = true;
                continue;
            }
 
            if (input == ']' && inVariable) {
                varNames.push(varName);
 
                let variable = getVariable(varName);
                expression += variable ? "[" + variable.id + "]" : "[0]";
                formula += 9;
 
                varName = '';
                inVariable = false;
                continue;
            }
 
            if (inVariable) {
                varName += input;
                continue;
            }
 
            formula += input;
            expression += input;
        }
 
        return {
            formula: formula,
            expression: expression,
            variables: varNames
        };
    }
 
    function validation() {
        let result = parseInput();
 
        try {
            for (var i = 0; i < result.variables.length; i++)
                if (!getVariable(result.variables[i]))
                    throw "Error: " + result.variables[i] + " does not exists!";
 
            eval(result.formula);
 
            notificaiton.removeClass('invalid').addClass('valid');
            notificaiton.removeAttr('title');
        } catch (ex) {
            notificaiton.addClass('invalid').removeClass('valid');
            notificaiton.attr('title', ex.name ? ex.name : ex);
            return false;
        }
 
        return true;
    }
 
    function setLastText(cursor) {
        expressionInput.addClass('in-valid-char');
        expressionInput.val(lastText);
        setCursorPosition(--cursor);
        setTimeout(function () { expressionInput.removeClass('in-valid-char'); }, 100);
        return true;
    }
 
    function setCursorPosition(position) {
        expressionInput.get(0).setSelectionRange(position, position);
    }
 
    //Suggestions
    function hideSuggestions() {
        suggestions.empty().hide();
    }
 
    function showSuggestions(val, cursor) {
        let varName = '',
            startIndex = 0;
 
        for (var i = cursor - 1; i > 0; i--) {
            if (val[i] == '[') {
                startIndex = i;
                break;
            }
 
            varName = val[i] + varName;
        }
 
        let optionsHTML = '',
            isFirstItem = true;
        for (var i = 0; i < options.variables.length; i++) {
            if (options.variables[i].name.toLowerCase().indexOf(varName.toLowerCase()) > -1) {
                optionsHTML += "<div class='exp-suggestion-item " + (isFirstItem ? "selected" : "") +
                    "' data-start='" + startIndex +
                    "' data-current='" + cursor +
                    "' data-id='" + options.variables[i].id + "'>" + options.variables[i].name + "</div>";
 
                isFirstItem = false;
            }
        }
 
        if (optionsHTML != '')
            suggestions.attr('data-index', 0).html(optionsHTML).slideDown();
        else
            hideSuggestions();
    }
 
    function selectVariable(div) {
        let text = expressionInput.val(),
            start = parseInt($(div).attr('data-start')) + 1,
            current = $(div).attr('data-current');
 
        text = text.substr(0, start) + $(div).text() + "] " + text.substr(current);
 
        expressionInput.val(text);
        lastText = text;
        inSearchMode = false;
        hideSuggestions();
 
        for (var i = current; i < text.length; i++)
            if (text[i] == "]") {
                setCursorPosition(i + 2);
                break;
            }
 
        validation();
    }
 
    return {
        getExpression: function () {
            return parseInput().expression;
        },
 
        setExpression: function (expression) {
            setExpresionToInput(expression);
        },
 
        isValid: function () {
            return validation();
        },
 
        parseExpression: function (expression) {
            return parseExpression(expression);
        },
 
        getInput: function () {
            return expressionInput.val();
        },
 
        getVariableById: function (variableId) {
            return getVariableById(variableId);
        }
    };
}
 