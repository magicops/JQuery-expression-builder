var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var funcs = {
    Add: function (x, y) {
        return x + y;
    },
    Sub: function (x, y) {
        return x - y;
    },
    Substr: function (str, from) {
        return str.substr(from);
    },
    majid: function () {
        return "majid";
    }
};
//abstract base-class
var GraphNode = /** @class */ (function () {
    function GraphNode() {
    }
    GraphNode.prototype.compute = function (ctx) { throw new Error("not implemented"); };
    GraphNode.prototype.toString = function () { throw new Error("not implemented"); };
    return GraphNode;
}());
//leaf-nodes
var ValueNode = /** @class */ (function (_super) {
    __extends(ValueNode, _super);
    function ValueNode(value) {
        var _this = _super.call(this) || this;
        _this.value = value;
        return _this;
    }
    ValueNode.prototype.compute = function () { return this.value; };
    ValueNode.prototype.toString = function () { return JSON.stringify(this.value); };
    return ValueNode;
}(GraphNode));
var PropertyNode = /** @class */ (function (_super) {
    __extends(PropertyNode, _super);
    function PropertyNode(property) {
        var _this = _super.call(this) || this;
        _this.property = property;
        return _this;
    }
    PropertyNode.prototype.compute = function (ctx) { return ctx[this.property]; };
    PropertyNode.prototype.toString = function () { return String(this.property); };
    return PropertyNode;
}(GraphNode));
//tree-nodes
var FuncNode = /** @class */ (function (_super) {
    __extends(FuncNode, _super);
    function FuncNode(op, node) {
        var _this = this;
        if (!(node instanceof GraphNode)) {
            throw new Error("invalid node passed");
        }
        _this = _super.call(this) || this;
        _this.op = op;
        _this.node = node;
        return _this;
    }
    FuncNode.prototype.compute = function (ctx) {
        var v = this.node.compute(ctx);
        var vars = v instanceof Array ? v : [v];
        var computes = vars
            .filter(function (v) { return v != ","; }) //remove ,
            .map(function (v) { return v instanceof GraphNode ? v.compute(ctx) : v; }); //compute each one
        var func = funcs[this.op];
        return func.apply(func, computes);
    };
    FuncNode.prototype.toString = function () {
        return "( " + this.op + " " + this.node.toString() + " )";
    };
    return FuncNode;
}(GraphNode));
var BinaryNode = /** @class */ (function (_super) {
    __extends(BinaryNode, _super);
    function BinaryNode(op, l, r) {
        var _this = this;
        if (!(l instanceof GraphNode && r instanceof GraphNode)) {
            throw new Error("invalid node passed");
        }
        _this = _super.call(this) || this;
        _this.op = op;
        _this.left = l;
        _this.right = r;
        return _this;
    }
    BinaryNode.prototype.compute = function (ctx) {
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
    };
    BinaryNode.prototype.toString = function () {
        return "( " + this.left.toString() + " " + this.op + " " + this.right.toString() + " )";
    };
    return BinaryNode;
}(GraphNode));
BinaryNode.operators = ["*", "/", "+", "-"];
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
        .sort(function (a, b) { return b.length - a.length; }) //so that ">=" is added before "=" and ">", for example
        .map(escapeForRegex)
        .join("|"),
    //properties
    //has to be after the operators
    /[a-zA-Z$_][a-zA-Z0-9$_]*/.source,
    //remaining (non-whitespace-)chars, just in case
    //has to be at the end
    /\S/.source
].map(function (s) { return "(" + s + ")"; }).join("|"), "g");
function parse(str) {
    var tokens = [];
    //abusing str.replace() as a RegExp.forEach
    str.replace(tokenParser, function (token, number, str, op, property) {
        if (number) {
            token = new ValueNode(+number);
        }
        else if (str) {
            str = str.replace(/'/g, '"');
            token = new ValueNode(JSON.parse(str));
            //}else if(bool){
            //  token = new ValueNode(bool === "true");
        }
        else if (property) {
            token = new PropertyNode(property);
        }
        else if (token == ',') {
            //do nothing
        }
        else if (!op) {
            throw new Error("unexpected token '" + token + "'");
        }
        tokens.push(token);
    });
    //detect negative numbers
    if (tokens[0] == "-" && tokens[1] instanceof ValueNode) {
        tokens[1].value = -1 * tokens[1].value;
        tokens.splice(0, 1);
    }
    for (var i = 0; i < tokens.length; i++) {
        if ((tokens[i] == '(' || BinaryNode.operators.indexOf(tokens[i]) > -1) &&
            tokens[i + 1] == "-" && tokens[i + 2] instanceof ValueNode) {
            tokens[i + 2].value = tokens[i + 2].value * -1;
            tokens.splice(i + 1, 1);
        }
    }
    for (var i, j; (i = tokens.lastIndexOf("(")) > -1 && (j = tokens.indexOf(")", i)) > -1;) {
        if (tokens[i - 1] instanceof PropertyNode) {
            var funcParam = i + 1 == j ? new ValueNode([]) : process(tokens.slice(i + 1, j));
            var op = tokens[i - 1];
            var vars = funcParam.value
                .filter(function (v) { return v != ","; }); //remove ,
            var func = funcs[op];
            if (!func) {
                throw new Error(op + " is not defined.");
            }
            if (vars.length != func.length)
                throw new Error(op + " requires " + func.length + " argument(s)");
            var funcNode = new FuncNode(tokens[i - 1], funcParam);
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
function process(tokens) {
    BinaryNode.operators.forEach(function (token) {
        for (var i = 1; (i = tokens.indexOf(token, i - 1)) > -1;) {
            tokens.splice(i - 1, 3, new BinaryNode(token, tokens[i - 1], tokens[i + 1]));
        }
    });
    if (tokens.indexOf(",") > -1) {
        var commaCount = tokens.filter(function (t) { return t == ","; }).length, argCount = commaCount * 2 + 1;
        if (tokens.length != argCount)
            throw new Error("Syntax error for the arguments: " + tokens.filter(function (t) { return t != ","; }).join(","));
        tokens = [new ValueNode(tokens)];
    }
    if (tokens.length !== 1) {
        console.log("error: ", tokens.slice());
        throw new Error("something went wrong");
    }
    return tokens[0];
}
function main() {
    var tokens = {
        props: [],
        funcs: [],
        strs: []
    };
    var reg = new RegExp([
        //properties
        /\[[a-zA-Z0-9$_]*\]+/.source,
    ].map(function (s) { return "(" + s + ")"; }).join("|"), "g");
    var replacer = function (token, prop, space, string, func) {
        if (prop) {
            tokens.props.push(prop.substring(1, prop.length - 1));
            return "prop" + tokens.props.length;
        }
        //if (string) {
        //  tokens.strs.push(string.substring(1, string.length - 1));
        //  return "str" + tokens.strs.length;
        //}
        //if (func) {
        //  tokens.funcs.push(func);
        //  return "func" + tokens.funcs.length;
        //}
        //if (space)
        //  return "";
    };
    var str = document.getElementById('formula').value, result = str.replace(reg, replacer);
    document.getElementById('pre').innerHTML = JSON.stringify(tokens, null, 2);
    var data = {
        "name_2": "Majid Akbari",
        x: 6
    };
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
    var c = tree.compute(data);
    document.getElementById('result').innerHTML = result + " = " + c + "<br />" + tree.toString();
    //console.log(JSON.stringify(tree, null, 2));
}
main();
//# sourceMappingURL=script.js.map