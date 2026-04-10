package request

type ClosePositionRequest struct {
	PositionID uint `json:"position_id" binding:"required"`
}
