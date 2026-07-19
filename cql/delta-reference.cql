typeside Ty = literal {
  types
    String Int
  constants
    Ada Alice : String
    eight six : Int
}

schema M0 = literal : Ty {
  entities
    Employee
  foreign_keys
    manager : Employee -> Employee
  path_equations
    Employee.manager.manager = Employee.manager
  attributes
    name : Employee -> String
    expectedHours actualHours : Employee -> Int
}

schema M1 = literal : Ty {
  entities
    Record
  foreign_keys
    supervisor : Record -> Record
  path_equations
    Record.supervisor.supervisor = Record.supervisor
  attributes
    label : Record -> String
    planned observed : Record -> Int
}

mapping F = literal : M0 -> M1 {
  entity
    Employee -> Record
  foreign_keys
    manager -> supervisor
  attributes
    name -> label
    expectedHours -> planned
    actualHours -> observed
}

instance sourceM0 = literal : M0 {
  generators
    root alice : Employee
  equations
    root.name = Ada
    root.expectedHours = eight
    root.actualHours = eight
    root.manager = root
    alice.name = Alice
    alice.expectedHours = eight
    alice.actualHours = six
    alice.manager = root
}

instance sigmaF = sigma F sourceM0
instance deltaSigmaF = delta F sigmaF
