// Import stylesheets
import './style.css';
import './src/expression-builder.css';
import './src/expression-builder.js';
import './data.js';

// Write Javascript code!
$(function(){
    expressionBuilder('#txt', {
        variables: data[0]
    });
    expressionBuilder('#txt2', {
        variables: data[1],
        suggestions: "up",
        expression: "[2] + 35"
    });

    $('#txt').keypress(function(){
      setTimeout(function(){
        let txtExp = expressionBuilder('#txt');
        let exp = txtExp.getExpression();
        $('.res-1-1').html("Expression: " + exp);

        let input = txtExp.getInput();
        $('.res-1-2').html("Input: " + input);
      }, 100);
    });

    $('#btn-1-2').click(function(){
      let txtExp = expressionBuilder('#txt2');
      txtExp.setExpression($('#txt-1-2').val());
    });
  });