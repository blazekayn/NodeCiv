CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_user_data`(IN i_username VARCHAR(255))
BEGIN
	SELECT gold, wood, food, population, happiness 
    FROM tbl_user 
    WHERE username = i_username;
    
    SELECT x_coord, y_coord, display_name
    FROm tbl_city
    WHERE owner_id = (SELECT user_id FROM tbl_user WHERE username = i_username);
END