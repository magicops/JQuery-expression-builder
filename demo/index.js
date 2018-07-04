$(function () {
    expressionBuilder2('#txt', {
        variables: [
            {
                variableId: 1,
                name: 'Age'
            },
            {
                variableId: 2,
                name: 'Gender'
          },
          {
            variableId: 3,
            name: '1TEST'
          }
        ]
    });
    expressionBuilder2('#txt2', {
        variables: [
            {
                variableId: 1,
                name: 'FirstName'
            },
            {
                variableId: 2,
                name: 'LastName'
            }
        ],
        suggestions: "up",
        expression: "[2] + 35"
    });

    $('#txt').keypress(function () {
        setTimeout(function () {
            let txtExp = expressionBuilder2('#txt');
            let exp = txtExp.getExpression();
            $('.res-1-1').html("Expression: " + exp);

            let input = txtExp.getInput();
            $('.res-1-2').html("Input: " + input);
        }, 100);
    });

    $('#btn-1-2').click(function () {
        let txtExp = expressionBuilder2('#txt2');
        txtExp.setExpression($('#txt-1-2').val());
    });
});
