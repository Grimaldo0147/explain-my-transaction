;; explain-wallet-story.clar
;; Clarity 2.05
;; Read-only helper contract for UX tooling on Stacks

(define-read-only (get-contract-metadata)
  (tuple
    (name (string-ascii 64 "Explain Wallet Story"))
    (version (string-ascii 16 "1.0.0"))
    (description
      (string-ascii 256
        "Read-only helper contract that provides on-chain metadata for transaction explanation and wallet story UX tools on Stacks"))
  )
)

(define-read-only (describe-wallet (wallet principal))
  (tuple
    (address wallet)
    (note
      (string-ascii 128
        "This wallet can be analyzed off-chain to generate a human-readable activity story"))
  )
)

(define-read-only (describe-transaction (txid (buff 32)))
  (tuple
    (transaction txid)
    (note
      (string-ascii 128
        "This transaction can be explained off-chain using decoded Stacks transaction data"))
  )
)