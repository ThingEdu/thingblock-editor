import type BlockUtility from '../engine/block-utility';

class Scratch3ProcedureBlocks {
    getPrimitives () {
        return {
            procedures_definition: this.definition,
            procedures_call: this.call,
            argument_reporter_string_number: this.argumentReporter,
            argument_reporter_boolean: this.argumentReporter
        };
    }

    definition () {
        // No-op: the definition hat only starts the blocks below it
    }

    call (args: {mutation: {proccode: string}, [paramId: string]: unknown}, util: BlockUtility) {
        if (util.stackFrame.executed) return;
        const procedureCode = args.mutation.proccode;
        const paramNamesIdsAndDefaults = util.getProcedureParamNamesIdsAndDefaults(procedureCode);

        // A custom block dragged between targets without its definition is a no-op, as in Scratch 2
        if (paramNamesIdsAndDefaults === null) return;

        const [paramNames, paramIds, paramDefaults] = paramNamesIdsAndDefaults;

        // Always start a fresh param scope so `getParam` never reads an outer call's params (#1729)
        util.initParams();
        for (let i = 0; i < paramIds.length; i++) {
            if (Object.hasOwn(args, paramIds[i])) {
                util.pushParam(paramNames[i], args[paramIds[i]]);
            } else {
                util.pushParam(paramNames[i], paramDefaults[i]);
            }
        }

        util.stackFrame.executed = true;
        util.startProcedure(procedureCode);
    }

    /** Reads a parameter of the innermost procedure call; 0 when it has none of that name. */
    argumentReporter (args: {VALUE: string}, util: BlockUtility) {
        const value = util.getParam(args.VALUE);
        return value === null ? 0 : value;
    }
}

export default Scratch3ProcedureBlocks;
