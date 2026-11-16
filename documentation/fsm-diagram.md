flowchart TD
    A([Start]) --> B[Registration]
    B --> C[Password Validation]
    C -->|Valid Password| D[Login]
    C -->|Invalid Password| B
    D -->|Correct Password| E[Authenticated]
    D -->|Wrong Password| F[Failed Attempt]
    F -->|Less than 3 failures| D
    F -->|3 failures, next login request| G[Account Locked]
    G -->|After 1 minute| H[Unlocked]
    H --> D
    E --> I([Logout])