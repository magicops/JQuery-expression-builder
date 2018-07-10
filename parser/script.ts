/// <reference path="../src/jquery.d.ts" />

interface ParserOption {
  funcs?: any,
  variables?: Array<ExpressionBuilderVariable>
}

let parser = function (expression: string, options?: ParserOption) {
  let defaults: ParserOption = {
    funcs: {},
    variables: []
  };
  options = $.extend({}, defaults, options);

  //abstract base-class
  abstract class GraphNode {
    abstract compute(): any;
    abstract toString(parseVariables?: boolean): string;
  }

  //leaf-nodes
  class ValueNode extends GraphNode {
    value: number | string | Array<GraphNode>;

    public getNumberValue(): number {
      return parseInt(this.value.toString());
    }

    public getStringValue(): string {
      return this.value.toString();
    }

    public getArrayValue(): Array<GraphNode> {
      return this.value as Array<GraphNode>;
    }

    constructor(value: number | string | Array<GraphNode>) {
      super();
      this.value = value;
    }
    compute() { return this.value; }
    toString(parseVariables: boolean = false) {
      if (this.value instanceof Array)
        return this.value
          .filter(v => !(v instanceof CommaNode))
          .map(v => v.toString(true))
          .join(",");

      if (typeof this.value === 'string')
        return `"${this.value}"`;

      return this.value.toString();
    }
  }

  class CommaNode extends GraphNode {
    compute() {
      return ","
    }
    toString(parseVariables?: boolean): string {
      return ",";
    }

  }

  class PropertyNode extends GraphNode {
    public property: any;
    public inBrackets: boolean;

    constructor(property, inBrackets: boolean = false) {
      super();
      this.property = property;
      this.inBrackets = inBrackets;
    }
    compute() {

      let variable;

      for (var i = 0; i < options.variables.length; i++) {
        let v = options.variables[i];
        if (v.name == this.property) {
          variable = v;
          break;
        }
      }

      if (variable === undefined) {
        throw new Error("Property '" + this.property + "' is not defined!");

        //let x = prompt("Enter a value for " + this.property),
        //  y: any;

        //if (!isNaN(parseInt(x)))
        //  y = parseInt(x);

        //ctx[this.property] = y;
      }

      return variable.value || variable.variableId;
    }
    toString(parseVariables: boolean = false) {
      if (parseVariables)
        for (var i = 0; i < options.variables.length; i++) {
          let v = options.variables[i];
          if (v.name == this.property)
            return `[${v.variableId}]`;
        }

      return String(this.property);
    }
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
    compute() {
      let v = this.node.compute();

      let vars = v instanceof Array ? v : [v];

      let computes = vars
        .filter(v => v != ",")//remove ,
        .map(v => v instanceof GraphNode ? (v as GraphNode).compute() : v);//compute each one

      let func = options.funcs[this.name] as Function;

      return func.apply(func, computes);
    }
    toString(parseVariables: boolean = false) {
      return this.name + "(" + this.node.toString(parseVariables) + ")";
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
    compute() {
      var l = this.left.compute();
      var r = this.right.compute();
      switch (this.op) {
        //computational operators
        case "+": return l + r;
        case "-": return l - r;
        case "*": return l * r;
        case "/": return l / r;
      }
      throw new Error("operator not implemented '" + this.op + "'");
    }

    toString(parseVariables: boolean = false) {
      return "( " + this.left.toString(parseVariables) + " " + this.op + " " + this.right.toString(parseVariables) + " )";
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

  function parse(str): GraphNode {
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
        token = new CommaNode();
      } else if (!op) {
        throw new Error("unexpected token '" + token + "'");
      }
      tokens.push(token);
    });

    //detect negative numbers
    if (tokens[0] == "-" && tokens[1] instanceof ValueNode) {
      (tokens[1] as ValueNode).value = -1 * (tokens[1] as ValueNode).getNumberValue();
      tokens.splice(0, 1);
    }

    for (var i = 0; i < tokens.length; i++) {
      if (BinaryNode.operators.concat(['(', ',']).indexOf(tokens[i]) > -1 && tokens[i + 1] == "-" && tokens[i + 2] instanceof ValueNode) {

        (tokens[i + 2] as ValueNode).value = (tokens[i + 2] as ValueNode).getNumberValue() * -1;
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
          varsLength = funcParam.value.filter(v => !(v instanceof CommaNode)).length;//remove ,
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

    let hasComma = false;
    for (var j = 0; j < tokens.length; j++) {
      if (tokens[j] instanceof CommaNode) {
        hasComma = true;
        break;
      }
    }

    if (hasComma) {

      let commaCount = tokens.filter(t => t == ",").length,
        argCount = commaCount * 2 + 1;

      if (tokens.length != argCount)
        throw new Error("Syntax error for the arguments: " + tokens.filter(t => !(t instanceof CommaNode)).join(","));

      tokens = [new ValueNode(tokens)];
    }

    if (tokens.length !== 1) {
      console.log("error: ", tokens.slice());
      throw new Error("something went wrong");
    }
    return tokens[0];
  }

  return {
    getExpressionTree: function () {
      try {
        return parse(expression);
      } catch (e) {
        return undefined;
      }
    },
    runExpressionTree: function () {
      try {
        let tree = parse(expression);
        return tree.compute();
      } catch (e) {
        return undefined;
      }
    },
    validate: function () {
      let result = "";
      try {
        parse(expression).compute();
      } catch (e) {
        result = e.message;
      }

      return result;
    }
  };
};
