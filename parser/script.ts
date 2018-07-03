/// <reference path="../src/jquery.d.ts" />

interface Parser {
  getExpressionTree();
  runExpressionTree(data: any);
  validate(): any;
}

interface JQuery {
  parser(options?: any): Parser;
}

var data = {
  "name_2": "Majid Akbari",
  x: 6
};

(function ($) {

  $.fn.extend({
    parser: function (options: any) {

      if (!this || this.length == 0)
        return this;

      return parser(this[this.length - 1], options);
    }
  });

  let parser = function (ctl: any, options) {
    let defaultFuncs = {
      Add: function (x, y) {
        return x + y;
      },
      Sub: function (x, y) {
        return x - y;
      },
      Substr: function (str: string, from: number) {
        if (!str)
          throw new Error("String is not degined!");

        if (typeof str !== "string")
          throw new Error("The passed parameter is not a string!");

        return str.substr(from);
      },
      majid: function () {
        return "majid";
      },
      test: function (x) {
        return x * 2;
      }
    };
    let defaults = {
      useDefaultFuncs: true,
      funcs: {}
    };
    options = $.extend({}, defaults, options);

    if (options.useDefaultFuncs)
      options.funcs = $.extend({}, defaultFuncs, options.funcs);

    //abstract base-class
    abstract class GraphNode {
      abstract compute(ctx): any;
      abstract toString(): string;
    }

    //leaf-nodes
    class ValueNode extends GraphNode {
      public value: any;

      constructor(value) {
        super();
        this.value = value;
      }
      compute() { return this.value; }
      toString() { return JSON.stringify(this.value); }
    }

    class PropertyNode extends GraphNode {
      public property: any;
      public inBrackets: boolean;

      constructor(property, inBrackets: boolean = false) {
        super();
        this.property = property;
        this.inBrackets = inBrackets;
      }
      compute(ctx) {

        if (!ctx[this.property]) {
          let x = prompt("Enter a value for " + this.property),
            y: any;

          if (!isNaN(parseInt(x)))
            y = parseInt(x);

          ctx[this.property] = y;
        }

        return ctx[this.property];
      }
      toString() { return String(this.property); }
    }

    //tree-nodes
    class FuncNode extends GraphNode {
      public node: GraphNode;
      public name: string;

      constructor(name, node: GraphNode) {
        if (!(node instanceof GraphNode)) {
          throw new Error("invalid node passed")
        }
        super();
        this.name = name;
        this.node = node;
      }
      compute(ctx) {
        let v = this.node.compute(ctx);

        let vars = v instanceof Array ? v : [v];

        let computes = vars
          .filter(v => v != ",")//remove ,
          .map(v => v instanceof GraphNode ? (v as GraphNode).compute(ctx) : v);//compute each one

        let func = options.funcs[this.name] as Function;

        return func.apply(func, computes);
      }
      toString() {
        return this.name + "(" + this.node.toString() + ")";
      }
    }

    class BinaryNode extends GraphNode {
      static operators: Array<string> = ["*", "/", "+", "-"];
      public op: string;
      public left: GraphNode;
      public right: GraphNode;

      constructor(op: string, left: GraphNode, right: GraphNode) {
        if (!(left instanceof GraphNode && right instanceof GraphNode)) {
          throw new Error("invalid node passed")
        }
        super();
        this.op = op;
        this.left = left;
        this.right = right;
      }
      compute(ctx) {
        var l = this.left.compute(ctx);
        var r = this.right.compute(ctx);
        switch (this.op) {
          //computational operators
          case "+": return l + r;
          case "-": return l - r;
          case "*": return l * r;
          case "/": return l / r;
        }
        throw new Error("operator not implemented '" + this.op + "'");
      }

      toString() {
        return "( " + this.left.toString() + " " + this.op + " " + this.right.toString() + " )";
      }
    }

    //dynamically build my parsing regex:
    var tokenParser = new RegExp([
      //properties
      /\[[a-zA-Z0-9$_]*\]+/.source,

      //numbers
      /\d+(?:\.\d*)?|\.\d+/.source,

      //string-literal
      /["](?:\\[\s\S]|[^"])+["]|['](?:\\[\s\S]|[^'])+[']/.source,

      //booleans
      //"true|false",

      //operators
      ["(", ")"].concat(BinaryNode.operators)
        .map(str => String(str).replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&'))
        .join("|"),

      //properties
      //has to be after the operators
      /[a-zA-Z$_][a-zA-Z0-9$_]*/.source,

      //remaining (non-whitespace-)chars, just in case
      //has to be at the end
      /\S/.source
    ].map(s => "(" + s + ")").join("|"), "g");

    function parse(str) {
      var tokens = [];
      //abusing str.replace() as a RegExp.forEach
      str.replace(tokenParser, function (token, prop, number, str, op, property) {
        if (number) {
          token = new ValueNode(+number);
        } else if (str) {
          str = str.replace(/'/g, '"');
          token = new ValueNode(JSON.parse(str));
          //}else if(bool){
          //  token = new ValueNode(bool === "true");
        } else if (property) {
          token = new PropertyNode(property);
        } else if (prop) {
          token = new PropertyNode(prop.substring(1, prop.length - 1), true);
        } else if (token == ',') {
          //do nothing
        } else if (!op) {
          throw new Error("unexpected token '" + token + "'");
        }
        tokens.push(token);
      });

      //detect negative numbers
      if (tokens[0] == "-" && tokens[1] instanceof ValueNode) {
        (tokens[1] as ValueNode).value = -1 * (tokens[1] as ValueNode).value;
        tokens.splice(0, 1);
      }

      for (var i = 0; i < tokens.length; i++) {
        if (BinaryNode.operators.concat(['(', ',']).indexOf(tokens[i]) > -1 && tokens[i + 1] == "-" && tokens[i + 2] instanceof ValueNode) {

          (tokens[i + 2] as ValueNode).value = (tokens[i + 2] as ValueNode).value * -1;
          tokens.splice(i + 1, 1);
        }
      }
      //end detect negative numbers

      //wrap inside any parentheses
      for (var i: number, j; (i = tokens.lastIndexOf("(")) > -1 && (j = tokens.indexOf(")", i)) > -1;) {

        //if before parentheses there is a property which means it is a function
        if (tokens[i - 1] instanceof PropertyNode && !(tokens[i - 1] as PropertyNode).inBrackets) {
          let op = tokens[i - 1].toString();

          let funcParam = i + 1 == j ? new ValueNode([]) : process(tokens.slice(i + 1, j));

          let varsLength = 1;

          if (funcParam instanceof ValueNode && funcParam.value instanceof Array) {
            varsLength = funcParam.value.filter(v => v != ",").length;//remove ,
          }



          let func = options.funcs[op] as Function;
          if (!func) {
            throw new Error(op + " is not defined.");
          }

          if (varsLength != func.length)
            throw new Error(op + " requires " + func.length + " argument(s)");

          let funcNode = new FuncNode(op, funcParam);
          tokens.splice(i - 1, j + 2 - i, funcNode);
        }
        else
          tokens.splice(i, j + 1 - i, process(tokens.slice(i + 1, j)));
      }
      if (~tokens.indexOf("(") || ~tokens.indexOf(")")) {
        throw new Error("mismatching brackets");
      }

      return process(tokens);
    }

    function process(tokens: Array<any>) {
      BinaryNode.operators.forEach(token => {
        for (var i = 1; (i = tokens.indexOf(token, i - 1)) > -1;) {
          tokens.splice(i - 1, 3, new BinaryNode(token, tokens[i - 1], tokens[i + 1]));
        }
      });

      if (tokens.indexOf(",") > -1) {

        let commaCount = tokens.filter(t => t == ",").length,
          argCount = commaCount * 2 + 1;

        if (tokens.length != argCount)
          throw new Error("Syntax error for the arguments: " + tokens.filter(t => t != ",").join(","));

        tokens = [new ValueNode(tokens)];
      }

      if (tokens.length !== 1) {
        console.log("error: ", tokens.slice());
        throw new Error("something went wrong");
      }
      return tokens[0];
    }

    function _getExpressionTree() {
      var str = ctl.value;

      var tree = parse(str);

      return tree;
    }

    return {
      getExpressionTree: function () {
        return _getExpressionTree();
      },
      runExpressiontree: function (data) {
        let tree = _getExpressionTree();
        return tree.compute(data);
      },
      validate: function () {
        try {
          let tree = _getExpressionTree();
          return true;
        } catch (e) {
          return e;
        }
      }
    };
  }


  main();

})(jQuery);


function main() {
  let p = $('#formula').parser();

  let v = p.validate();

  if (v !== true) {
    console.error(v.message);
    document.getElementById('result').innerHTML = '';
    return;
  }


  let tree = p.getExpressionTree();
  let result = 1;//p.runExpressionTree(data);
  document.getElementById('result').innerHTML = $('#formula').val() + " = " + result + "<br />" + tree.toString();
  //console.log(JSON.stringify(tree, null, 2));
}
