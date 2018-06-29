let funcs = {
  Add: function (x, y) {
    return x + y;
  },
  Sub: function (x, y) {
    return x - y;
  },
  Substr: function (str: string, from: number) {
    return str.substr(from);
  },
  majid: function () {
    return "majid";
  }
};

var data = {
  "name_2": "Majid Akbari",
  x: 6
}

let parser = function () {

  //abstract base-class
  class GraphNode {
    public op: any;
    public left: GraphNode;
    public right: GraphNode;

    compute(ctx): any { throw new Error("not implemented") }
    toString(): string { throw new Error("not implemented") }
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

    constructor(property) {
      super();
      this.property = property;
    }
    compute(ctx) { return ctx[this.property]; }
    toString() { return String(this.property); }
  }

  //tree-nodes
  class FuncNode extends GraphNode {
    static operators: Array<string>;

    public node: GraphNode;

    constructor(op, node: GraphNode) {
      if (!(node instanceof GraphNode)) {
        throw new Error("invalid node passed")
      }
      super();
      this.op = op;
      this.node = node;
    }
    compute(ctx) {
      let v = this.node.compute(ctx);

      let vars = v instanceof Array ? v : [v];

      let computes = vars
        .filter(v => v != ",")//remove ,
        .map(v => v instanceof GraphNode ? (v as GraphNode).compute(ctx) : v);//compute each one

      let func = funcs[this.op] as Function;

      return func.apply(func, computes);
    }
    toString() {
      return "( " + this.op + " " + this.node.toString() + " )";
    }
  }


  class BinaryNode extends GraphNode {
    static operators: Array<string>;

    constructor(op, l, r) {
      if (!(l instanceof GraphNode && r instanceof GraphNode)) {
        throw new Error("invalid node passed")
      }
      super();
      this.op = op;
      this.left = l;
      this.right = r;
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
  BinaryNode.operators = ["*", "/", "+", "-"]

  function escapeForRegex(str) {
    return String(str).replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&');
  }

  //dynamically build my parsing regex:
  var tokenParser = new RegExp([
    //numbers
    /\d+(?:\.\d*)?|\.\d+/.source,

    //string-literal
    /["](?:\\[\s\S]|[^"])+["]|['](?:\\[\s\S]|[^'])+[']/.source,

    //booleans
    //"true|false",

    //operators
    ["(", ")"].concat(FuncNode.operators, BinaryNode.operators)
      .sort((a, b) => b.length - a.length) //so that ">=" is added before "=" and ">", for example
      .map(escapeForRegex)
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
    str.replace(tokenParser, function (token, number, str, op, property) {
      if (number) {
        token = new ValueNode(+number);
      } else if (str) {
        str = str.replace(/'/g, '"');
        token = new ValueNode(JSON.parse(str));
        //}else if(bool){
        //  token = new ValueNode(bool === "true");
      } else if (property) {
        token = new PropertyNode(property);
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

    for (var i: number, j; (i = tokens.lastIndexOf("(")) > -1 && (j = tokens.indexOf(")", i)) > -1;) {
      if (tokens[i - 1] instanceof PropertyNode) {

        let funcParam = i + 1 == j ? new ValueNode([]) : process(tokens.slice(i + 1, j));
        let op = tokens[i - 1];

        let vars = funcParam.value
          .filter(v => v != ",");//remove ,

        let func = funcs[op] as Function;
        if (!func) {
          throw new Error(op + " is not defined.");
        }

        if (vars.length != func.length)
          throw new Error(op + " requires " + func.length + " argument(s)");

        let funcNode = new FuncNode(tokens[i - 1], funcParam);
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

  return {
    getExpressionTree: function () {
      var tokens = {
        props: [],
        funcs: [],
        strs: []
      };

      var reg = new RegExp([
        //properties
        /\[[a-zA-Z0-9$_]*\]+/.source,
      ].map(s => "(" + s + ")").join("|"), "g");

      var replacer = function (token, prop, space, string, func) {

        if (prop) {
          tokens.props.push(prop.substring(1, prop.length - 1));
          return "prop" + tokens.props.length;
        }
      }

      var str = (<HTMLInputElement>document.getElementById('formula')).value,
        result = str.replace(reg, replacer);

      document.getElementById('pre').innerHTML = JSON.stringify(tokens, null, 2);

      var tree;
      try {
        tree = parse(result);
      }
      catch (ex) {
        alert(ex);
      }

      //for (var i = 0; i < tokens.strs.length; i++) {
      //  data["str" + (i + 1)] = tokens.strs[i];
      //}

      for (var i = 0; i < tokens.props.length; i++) {
        data["prop" + (i + 1)] = data[tokens.props[i]];
      }
      if (!tree)
        return;

      let c = tree.compute(data);

      document.getElementById('result').innerHTML = result + " = " + c + "<br />" + tree.toString();
  //console.log(JSON.stringify(tree, null, 2));
    },
    runExpressiontree: function (data) {

    }
  };
}

parser().getExpressionTree();
