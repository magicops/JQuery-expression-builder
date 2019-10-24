var funcs = {
    Add: function (x, y) {
        return x + y;
    },
    Sub: function (x, y) {
        return x - y;
    },
    Substr: function (str, from) {
        if (!str)
            throw new Error("In the 'Substr' function the first parameter is not defined!");
        if (typeof str !== "string")
            throw new Error("The 'Substr' function accepts a string for the first parameter which is not a string!");
        return str.substr(from);
    }
};
$(function () {
    $('#txt').expressionBuilder({
        functions: funcs,
        variables: [
            {
                variableId: 1,
                name: 'Age'
            },
            {
                variableId: 2,
                name: 'Gender'
            }
        ]
    });
    $('#txt2').expressionBuilder({
        variables: [
            {
                variableId: "v1",
                name: 'FirstName'
            },
            {
                variableId: "v2",
                name: 'LastName'
            }
        ],
        suggestions: "up",
        expression: "[v2] + 35"
    });
    $('#txt').keypress(function () {
        setTimeout(function () {
            var txtExp = $('#txt').expressionBuilder();
            var exp = txtExp.getExpression();
            $('.res-1-1').html("Expression: " + exp + " = " + txtExp.runExpression());
            var input = txtExp.getInput();
            $('.res-1-2').html("Input: " + input);
        }, 100);
    });
    $('#btn-1-2').click(function () {
        var txtExp = $('#txt2').expressionBuilder();
        txtExp.setExpression($('#txt-1-2').val());
    });
});
//# sourceMappingURL=index.js.map