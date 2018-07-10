
let funcs = {
  Add: function (x, y) {
    return x + y;
  },
  Sub: function(x, y) {
    return x - y;
  },
  Substr: function (str, from) {
    if (!str)
      throw new Error("In the 'Substr' function the first parameter is not defined!");

    if (typeof str !== "string")
      throw new Error("The 'Substr' function accepts a string for the first parameter which is not a string!");

    return str.substr(from);
  },
  majid: function () {
    return "majid";
  },
  test: function (x) {
    return x * 2;
  }
};


$(function () {
  expressionBuilder2('#txt', {
    funcs: funcs,
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
