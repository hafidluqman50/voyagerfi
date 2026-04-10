package request

type WithdrawRequest struct {
	Amount string `json:"amount" binding:"required"`
}
