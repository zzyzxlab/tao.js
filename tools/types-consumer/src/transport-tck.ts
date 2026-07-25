import { Kernel } from '@tao.js/core';
import {
  runTransportCompliance,
  assertTransportCompliance,
} from '@tao.js/transport-tck';
import type { Link, ComplianceResult } from '@tao.js/transport-tck';
import type { AssertFalse, IsAny } from './helpers';

type _link = AssertFalse<IsAny<Link>>;
type _complianceResult = AssertFalse<IsAny<ComplianceResult>>;

async function check(): Promise<void> {
  const makeLink = (): Link => ({
    a: new Kernel(),
    b: new Kernel(),
    close: () => {},
  });

  const res = await runTransportCompliance(makeLink, { timeoutMs: 500 });
  const ok: boolean = res.pass;
  const results: ComplianceResult[] = res.results;
  for (const r of results) {
    const name: string = r.name;
    const passed: boolean = r.pass;
    void name;
    void passed;
  }
  void ok;

  const all: ComplianceResult[] = await assertTransportCompliance(makeLink, {
    timeoutMs: 500,
  });
  void all;
}
void check;
