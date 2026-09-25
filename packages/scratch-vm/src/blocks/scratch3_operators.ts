import Cast from '../util/cast';
import MathUtil from '../util/math-util';

type NumArgs = {NUM1: unknown, NUM2: unknown};
type OperandArgs = {OPERAND1: unknown, OPERAND2: unknown};

class Scratch3OperatorsBlocks {
    getPrimitives () {
        return {
            operator_add: this.add,
            operator_subtract: this.subtract,
            operator_multiply: this.multiply,
            operator_divide: this.divide,
            operator_lt: this.lt,
            operator_equals: this.equals,
            operator_gt: this.gt,
            operator_and: this.and,
            operator_or: this.or,
            operator_not: this.not,
            operator_random: this.random,
            operator_join: this.join,
            operator_letter_of: this.letterOf,
            operator_length: this.length,
            operator_contains: this.contains,
            operator_mod: this.mod,
            operator_round: this.round,
            operator_mathop: this.mathop
        };
    }

    add (args: NumArgs) {
        return Cast.toNumber(args.NUM1) + Cast.toNumber(args.NUM2);
    }

    subtract (args: NumArgs) {
        return Cast.toNumber(args.NUM1) - Cast.toNumber(args.NUM2);
    }

    multiply (args: NumArgs) {
        return Cast.toNumber(args.NUM1) * Cast.toNumber(args.NUM2);
    }

    divide (args: NumArgs) {
        return Cast.toNumber(args.NUM1) / Cast.toNumber(args.NUM2);
    }

    lt (args: OperandArgs) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) < 0;
    }

    equals (args: OperandArgs) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) === 0;
    }

    gt (args: OperandArgs) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) > 0;
    }

    and (args: OperandArgs) {
        return Cast.toBoolean(args.OPERAND1) && Cast.toBoolean(args.OPERAND2);
    }

    or (args: OperandArgs) {
        return Cast.toBoolean(args.OPERAND1) || Cast.toBoolean(args.OPERAND2);
    }

    not (args: {OPERAND: unknown}) {
        return !Cast.toBoolean(args.OPERAND);
    }

    random (args: {FROM: unknown, TO: unknown}) {
        const nFrom = Cast.toNumber(args.FROM);
        const nTo = Cast.toNumber(args.TO);
        const low = Math.min(nFrom, nTo);
        const high = Math.max(nFrom, nTo);
        if (low === high) return low;
        // Two integer arguments give an integer result
        if (Cast.isInt(args.FROM) && Cast.isInt(args.TO)) {
            return low + Math.floor(Math.random() * ((high + 1) - low));
        }
        return (Math.random() * (high - low)) + low;
    }

    join (args: {STRING1: unknown, STRING2: unknown}) {
        return Cast.toString(args.STRING1) + Cast.toString(args.STRING2);
    }

    letterOf (args: {LETTER: unknown, STRING: unknown}) {
        const index = Cast.toNumber(args.LETTER) - 1;
        const str = Cast.toString(args.STRING);
        if (index < 0 || index >= str.length) return '';
        return str.charAt(index);
    }

    length (args: {STRING: unknown}) {
        return Cast.toString(args.STRING).length;
    }

    contains (args: {STRING1: unknown, STRING2: unknown}) {
        return Cast.toString(args.STRING1).toLowerCase()
            .includes(Cast.toString(args.STRING2).toLowerCase());
    }

    mod (args: NumArgs) {
        const n = Cast.toNumber(args.NUM1);
        const modulus = Cast.toNumber(args.NUM2);
        let result = n % modulus;
        // Scratch mod uses floored division instead of truncated division
        if (result / modulus < 0) result += modulus;
        return result;
    }

    round (args: {NUM: unknown}) {
        return Math.round(Cast.toNumber(args.NUM));
    }

    mathop (args: {OPERATOR: unknown, NUM: unknown}) {
        const operator = Cast.toString(args.OPERATOR).toLowerCase();
        const n = Cast.toNumber(args.NUM);
        switch (operator) {
        case 'abs': return Math.abs(n);
        case 'floor': return Math.floor(n);
        case 'ceiling': return Math.ceil(n);
        case 'sqrt': return Math.sqrt(n);
        case 'sin': return parseFloat(Math.sin((Math.PI * n) / 180).toFixed(10));
        case 'cos': return parseFloat(Math.cos((Math.PI * n) / 180).toFixed(10));
        case 'tan': return MathUtil.tan(n);
        case 'asin': return (Math.asin(n) * 180) / Math.PI;
        case 'acos': return (Math.acos(n) * 180) / Math.PI;
        case 'atan': return (Math.atan(n) * 180) / Math.PI;
        case 'ln': return Math.log(n);
        case 'log': return Math.log(n) / Math.LN10;
        case 'e ^': return Math.exp(n);
        case '10 ^': return Math.pow(10, n);
        }
        return 0;
    }
}

export default Scratch3OperatorsBlocks;
