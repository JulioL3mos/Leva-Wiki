import { DEPARTMENT_OPTIONS } from "../departments";

describe("department options", () => {
  it("includes Leads as a selectable department", () => {
    expect(DEPARTMENT_OPTIONS).toContain("Leads");
  });
});
