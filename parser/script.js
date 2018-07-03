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
var data = {
    "name_2": "Majid Akbari",
    x: 6
};
(function ($) {
    $.fn.extend({
        parser: function (options) {
            if (!this || this.length == 0)
                return this;
            return parser(this[this.length - 1], options);
        }
    });
    var parser = function (ctl, options) {
        var defaultFuncs = {
            Add: function (x, y) {
                return x + y;
            },
            Sub: function (x, y) {
                return x - y;
            },
            Substr: function (str, from) {
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
        var defaults = {
            useDefaultFuncs: true,
            funcs: {}
        };
        options = $.extend({}, defaults, options);
        if (options.useDefaultFuncs)
            options.funcs = $.extend({}, defaultFuncs, options.funcs);
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
            ValueNode.prototype.compute = function () { return this.value; };
            ValueNode.prototype.toString = function () { return JSON.stringify(this.value); };
            return ValueNode;
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
            PropertyNode.prototype.compute = function (ctx) {
                if (!ctx[this.property]) {
                    var x = prompt("Enter a value for " + this.property), y = void 0;
                    if (!isNaN(parseInt(x)))
                        y = parseInt(x);
                    ctx[this.property] = y;
                }
                return ctx[this.property];
            };
            PropertyNode.prototype.toString = function () { return String(this.property); };
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
            FuncNode.prototype.compute = function (ctx) {
                var v = this.node.compute(ctx);
                var vars = v instanceof Array ? v : [v];
                var computes = vars
                    .filter(function (v) { return v != ","; }) //remove ,
                    .map(function (v) { return v instanceof GraphNode ? v.compute(ctx) : v; }); //compute each one
                var func = options.funcs[this.name];
                return func.apply(func, computes);
            };
            FuncNode.prototype.toString = function () {
                return this.name + "(" + this.node.toString() + ")";
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
                if (BinaryNode.operators.concat(['(', ',']).indexOf(tokens[i]) > -1 && tokens[i + 1] == "-" && tokens[i + 2] instanceof ValueNode) {
                    tokens[i + 2].value = tokens[i + 2].value * -1;
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
                        varsLength = funcParam.value.filter(function (v) { return v != ","; }).length; //remove ,
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
                var tree = _getExpressionTree();
                return tree.compute(data);
            },
            validate: function () {
                try {
                    var tree = _getExpressionTree();
                    return true;
                }
                catch (e) {
                    return e;
                }
            }
        };
    };
    main();
})(jQuery);
function main() {
    var p = $('#formula').parser();
    var v = p.validate();
    if (v !== true) {
        console.error(v.message);
        document.getElementById('result').innerHTML = '';
        return;
    }
    var tree = p.getExpressionTree();
    var result = 1; //p.runExpressionTree(data);
    document.getElementById('result').innerHTML = $('#formula').val() + " = " + result + "<br />" + tree.toString();
    //console.log(JSON.stringify(tree, null, 2));
}
//# sourceMappingURL=script.js.map