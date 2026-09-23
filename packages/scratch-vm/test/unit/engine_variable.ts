import {test} from 'tap';
import {Parser} from 'htmlparser2';
import Variable from '../../src/engine/variable.ts';

test('normalizeDataType keeps known types only', t => {
    t.equal(Variable.normalizeDataType('int'), 'int');
    t.equal(new Variable('varId', 'varName', Variable.SCALAR_TYPE, 'float').dataType, 'float');
    t.equal(Variable.normalizeDataType('double'), '');
    t.equal(Variable.normalizeDataType(undefined), '');
    t.end();
});

test('invalid type throws', t => {
    t.throws(() => new Variable('varId', 'varName', 'bogus' as never), /Invalid variable type: bogus/);
    t.end();
});

test('spec', t => {
    t.type(typeof Variable.SCALAR_TYPE, typeof Variable.LIST_TYPE);
    t.type(typeof Variable.SCALAR_TYPE, typeof Variable.BROADCAST_MESSAGE_TYPE);

    const varId = 'varId';
    const varName = 'varName';
    let v = new Variable(
        varId,
        varName,
        Variable.SCALAR_TYPE
    );

    t.type(Variable, 'function');
    t.type(v, 'object');
    t.ok(v instanceof Variable);

    t.equal(v.id, varId);
    t.equal(v.name, varName);
    t.equal(v.type, Variable.SCALAR_TYPE);
    t.type(v.value, 'number');

    t.type(v.toXML, 'function');

    v = new Variable(
        varId,
        varName,
        Variable.LIST_TYPE
    );
    t.ok(Array.isArray(v.value));

    v = new Variable(
        varId,
        varName,
        Variable.BROADCAST_MESSAGE_TYPE
    );
    t.equal(v.value, 'varName');

    t.end();
});

test('toXML', t => {
    const varId = 'varId';
    const varName = 'varName';
    const varIsLocal = false;
    const v = new Variable(
        varId,
        varName,
        Variable.SCALAR_TYPE
    );

    const parser = new Parser({
        onopentag: function (name, attribs){
            if (name === 'variable'){
                t.equal(attribs.type, Variable.SCALAR_TYPE);
                t.equal(attribs.id, varId);
                t.equal(attribs.islocal, varIsLocal.toString());
            }
        },
        ontext: function (text){
            t.equal(text, varName);
        }
    }, {decodeEntities: false});
    parser.write(v.toXML(false));
    parser.end();

    t.end();
});

test('escape variable name for XML', t => {
    const varId = 'varId';
    const varName = '<>&\'"';
    const varIsLocal = false;
    const v = new Variable(
        varId,
        varName,
        Variable.SCALAR_TYPE
    );

    const parser = new Parser({
        onopentag: function (name, attribs){
            if (name === 'variable'){
                t.equal(attribs.type, Variable.SCALAR_TYPE);
                t.equal(attribs.id, varId);
                t.equal(attribs.islocal, varIsLocal.toString());
            }
        },
        ontext: function (text){
            t.equal(text, '&lt;&gt;&amp;&apos;&quot;');
        }
    }, {decodeEntities: false});
    parser.write(v.toXML(false));
    parser.end();

    t.end();
});
