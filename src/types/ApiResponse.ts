/**

* Shared Server Action response contract (design.md §7.3).
*
* Every Studio Server Action, including all Epic 2 auth actions,
* returns this shape instead of throwing.
  */
  export type ActionResult<T> =
  | {
  success: true;
  data: T;
  }
  | {
  success: false;
  error: {
  message: string;
  fieldErrors?: Record<string, string[]>;
  };
  };
