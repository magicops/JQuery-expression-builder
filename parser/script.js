/// <reference path="../src/jquery.d.ts" />
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
var parser = function (expression, options) {
    var defaults = {
        funcs: {},
        variables: []
    };
    options = $.extend({}, defaults, options);
    //abstract base-class
    var GraphNode = /** @class */ (function () {
        function GraphNode() {
        }
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
        ValueNode.prototype.getNumberValue = function () {
            return parseInt(this.value.toString());
        };
        ValueNode.prototype.getStringValue = function () {
            return this.value.toString();
        };
        ValueNode.prototype.getArrayValue = function () {
            return this.value;
        };
        ValueNode.prototype.compute = function () { return this.value; };
        ValueNode.prototype.toString = function (parseVariables) {
            if (parseVariables === void 0) { parseVariables = false; }
            if (this.value instanceof Array)
                return this.value
                    .filter(function (v) { return !(v instanceof CommaNode); })
                    .map(function (v) { return v.toString(true); })
                    .join(",");
            if (typeof this.value === 'string')
                return "\"" + this.value + "\"";
            return this.value.toString();
        };
        return ValueNode;
    }(GraphNode));
    var CommaNode = /** @class */ (function (_super) {
        __extends(CommaNode, _super);
        function CommaNode() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        CommaNode.prototype.compute = function () {
            return ",";
        };
        CommaNode.prototype.toString = function (parseVariables) {
            return ",";
        };
        return CommaNode;
    }(GraphNode));
    var PropertyNode = /** @class */ (function (_super) {
        __extends(PropertyNode, _super);
        function PropertyNode(property, inBrackets) {
            if (inBrackets === void 0) { inBrackets = false; }
            var _this = _super.call(this) || this;
            _this.property = property;
            _this.inBrackets = inBrackets;
            return _this;
        }
        PropertyNode.prototype.compute = function () {
            var variable;
            for (var i = 0; i < options.variables.length; i++) {
                var v = options.variables[i];
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
        };
        PropertyNode.prototype.toString = function (parseVariables) {
            if (parseVariables === void 0) { parseVariables = false; }
            if (parseVariables)
                for (var i = 0; i < options.variables.length; i++) {
                    var v = options.variables[i];
                    if (v.name == this.property)
                        return "[" + v.variableId + "]";
                }
            return String(this.property);
        };
        return PropertyNode;
    }(GraphNode));
    //tree-nodes
    var FuncNode = /** @class */ (function (_super) {
        __extends(FuncNode, _super);
        function FuncNode(name, node) {
            var _this = this;
            if (!(node instanceof GraphNode)) {
                throw new Error("invalid node passed");
            }
            _this = _super.call(this) || this;
            _this.name = name;
            _this.node = node;
            return _this;
        }
        FuncNode.prototype.compute = function () {
            var v = this.node.compute();
            var vars = v instanceof Array ? v : [v];
            var computes = vars
                .filter(function (v) { return v != ","; }) //remove ,
                .map(function (v) { return v instanceof GraphNode ? v.compute() : v; }); //compute each one
            var func = options.funcs[this.name];
            return func.apply(func, computes);
        };
        FuncNode.prototype.toString = function (parseVariables) {
            if (parseVariables === void 0) { parseVariables = false; }
            return this.name + "(" + this.node.toString(parseVariables) + ")";
        };
        return FuncNode;
    }(GraphNode));
    var BinaryNode = /** @class */ (function (_super) {
        __extends(BinaryNode, _super);
        function BinaryNode(op, left, right) {
            var _this = this;
            if (!(left instanceof GraphNode && right instanceof GraphNode)) {
                throw new Error("invalid node passed");
            }
            _this = _super.call(this) || this;
            _this.op = op;
            _this.left = left;
            _this.right = right;
            return _this;
        }
        BinaryNode.prototype.compute = function () {
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
        };
        BinaryNode.prototype.toString = function (parseVariables) {
            if (parseVariables === void 0) { parseVariables = false; }
            return "( " + this.left.toString(parseVariables) + " " + this.op + " " + this.right.toString(parseVariables) + " )";
        };
        BinaryNode.operators = ["*", "/", "+", "-"];
        return BinaryNode;
    }(GraphNode));
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
            .map(function (str) { return String(str).replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&'); })
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
        str.replace(tokenParser, function (token, prop, number, str, op, property) {
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
            else if (prop) {
                token = new PropertyNode(prop.substring(1, prop.length - 1), true);
            }
            else if (token == ',') {
                token = new CommaNode();
            }
            else if (!op) {
                throw new Error("unexpected token '" + token + "'");
            }
            tokens.push(token);
        });
        //detect negative numbers
        if (tokens[0] == "-" && tokens[1] instanceof ValueNode) {
            tokens[1].value = -1 * tokens[1].getNumberValue();
            tokens.splice(0, 1);
        }
        for (var i = 0; i < tokens.length; i++) {
            if (BinaryNode.operators.concat(['(', ',']).indexOf(tokens[i]) > -1 && tokens[i + 1] == "-" && tokens[i + 2] instanceof ValueNode) {
                tokens[i + 2].value = tokens[i + 2].getNumberValue() * -1;
                tokens.splice(i + 1, 1);
            }
        }
        //end detect negative numbers
        //wrap inside any parentheses
        for (var i, j; (i = tokens.lastIndexOf("(")) > -1 && (j = tokens.indexOf(")", i)) > -1;) {
            //if before parentheses there is a property which means it is a function
            if (tokens[i - 1] instanceof PropertyNode && !tokens[i - 1].inBrackets) {
                var op = tokens[i - 1].toString();
                var funcParam = i + 1 == j ? new ValueNode([]) : process(tokens.slice(i + 1, j));
                var varsLength = 1;
                if (funcParam instanceof ValueNode && funcParam.value instanceof Array) {
                    varsLength = funcParam.value.filter(function (v) { return !(v instanceof CommaNode); }).length; //remove ,
                }
                var func = options.funcs[op];
                if (!func) {
                    throw new Error(op + " is not defined.");
                }
                if (varsLength != func.length)
                    throw new Error(op + " requires " + func.length + " argument(s)");
                var funcNode = new FuncNode(op, funcParam);
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
        var hasComma = false;
        for (var j = 0; j < tokens.length; j++) {
            if (tokens[j] instanceof CommaNode) {
                hasComma = true;
                break;
            }
        }
        if (hasComma) {
            var commaCount = tokens.filter(function (t) { return t == ","; }).length, argCount = commaCount * 2 + 1;
            if (tokens.length != argCount)
                throw new Error("Syntax error for the arguments: " + tokens.filter(function (t) { return !(t instanceof CommaNode); }).join(","));
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
            }
            catch (e) {
                return undefined;
            }
        },
        runExpressionTree: function () {
            try {
                var tree = parse(expression);
                return tree.compute();
            }
            catch (e) {
                return undefined;
            }
        },
        validate: function () {
            var result = "";
            try {
                parse(expression).compute();
            }
            catch (e) {
                result = e.message;
            }
            return result;
        }
    };
};
//# sourceMappingURL=script.js.map